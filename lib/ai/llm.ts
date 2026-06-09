/**
 * Server-side LLM streaming helper.
 *
 * Calls the primary provider (Mistral) and falls back to the secondary
 * (Deepseek) on error. Both expose an OpenAI-compatible streaming chat
 * completions API, so we can parse their SSE the same way.
 *
 * Keys are read from the Vercel environment (MISTRAL_API_KEY, DEEPSEEK_API_KEY).
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProviderConfig {
  name: string;
  url: string;
  apiKey: string | undefined;
  model: string;
}

function getProviders(): ProviderConfig[] {
  return [
    {
      name: "mistral",
      url: "https://api.mistral.ai/v1/chat/completions",
      apiKey: process.env.MISTRAL_API_KEY,
      model: process.env.MISTRAL_MODEL ?? "mistral-large-latest",
    },
    {
      name: "deepseek",
      url: "https://api.deepseek.com/v1/chat/completions",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    },
  ];
}

export interface StreamOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  /**
   * Per-provider model override, keyed by provider name ("mistral", "deepseek").
   * Lets latency-sensitive routes pick a faster model than the default large one.
   */
  modelOverride?: Partial<Record<string, string>>;
  /**
   * Max time (ms) to wait for a provider's response headers before aborting it
   * and failing over to the next provider. Defaults to 12s.
   */
  connectTimeoutMs?: number;
}

/** Aborts when any of the given signals abort. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/**
 * Opens a streaming chat completion, trying providers in order until one
 * responds. Returns the upstream fetch Response (OpenAI-compatible SSE body).
 * Throws with a combined diagnostic if every provider fails.
 */
export async function openChatStream({
  messages,
  maxTokens = 1024,
  temperature = 0.7,
  signal,
  modelOverride,
  connectTimeoutMs = 12000,
}: StreamOptions): Promise<Response> {
  const errors: string[] = [];

  for (const provider of getProviders()) {
    if (!provider.apiKey) {
      errors.push(`${provider.name}: clé absente`);
      continue;
    }

    const model = modelOverride?.[provider.name] ?? provider.model;

    // Abort a provider that hasn't started responding within the budget, so we
    // fail over to the next one instead of stalling on a hung connection.
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), connectTimeoutMs);
    const composedSignal = signal
      ? anySignal([signal, timeout.signal])
      : timeout.signal;

    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: composedSignal,
      });

      // Headers received — clear the connect timeout and let the body stream
      // at its own pace.
      clearTimeout(timer);

      if (res.ok && res.body) return res;

      const detail = await res.text().catch(() => "");
      errors.push(`${provider.name} (${model}): HTTP ${res.status} ${detail.slice(0, 200)}`);
    } catch (e) {
      clearTimeout(timer);
      errors.push(`${provider.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`Aucun fournisseur LLM disponible — ${errors.join(" | ")}`);
}

/**
 * Returns a client byte stream IMMEDIATELY, then connects to the LLM provider
 * and pumps deltas from inside the stream.
 *
 * This is important on serverless platforms (Vercel): if we awaited the
 * provider's response headers before returning the HTTP Response, a slow model
 * start would send no bytes and the gateway would kill the request with a 504.
 * By returning the stream first and emitting an immediate `heartbeat`, the
 * gateway sees an active response and keeps the connection open while the model
 * warms up.
 *
 * `format` maps each content delta to the bytes emitted to the client.
 * `doneMarker` is emitted once when the upstream completes (or errors), so the
 * client's read loop always terminates. `heartbeat` is emitted right away.
 */
export function streamChatResponse(
  options: StreamOptions,
  format: (delta: string) => string,
  doneMarker?: string,
  heartbeat?: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Establish the response on the wire before the (possibly slow) connect.
      if (heartbeat) controller.enqueue(encoder.encode(heartbeat));

      let upstream: Response;
      try {
        upstream = await openChatStream(options);
      } catch (e) {
        console.error("openChatStream failed:", e);
        // Always close cleanly so the client's read loop unblocks.
        if (doneMarker) controller.enqueue(encoder.encode(doneMarker));
        controller.close();
        return;
      }

      const reader = upstream.body!.getReader();
      let buffer = "";

      const finish = () => {
        if (doneMarker) controller.enqueue(encoder.encode(doneMarker));
        controller.close();
        reader.cancel().catch(() => {});
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            finish();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data) continue;
            if (data === "[DONE]") {
              finish();
              return;
            }

            try {
              const json = JSON.parse(data);
              const delta: string | undefined = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(format(delta)));
              const stop: string | null | undefined =
                json.choices?.[0]?.finish_reason;
              if (stop) {
                finish();
                return;
              }
            } catch {
              // Ignore keep-alive comments and non-JSON lines.
            }
          }
        }
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
