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
}: StreamOptions): Promise<Response> {
  const errors: string[] = [];

  for (const provider of getProviders()) {
    if (!provider.apiKey) {
      errors.push(`${provider.name}: clé absente`);
      continue;
    }

    const model = modelOverride?.[provider.name] ?? provider.model;

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
        signal,
      });

      if (res.ok && res.body) return res;

      const detail = await res.text().catch(() => "");
      errors.push(`${provider.name} (${model}): HTTP ${res.status} ${detail.slice(0, 200)}`);
    } catch (e) {
      errors.push(`${provider.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`Aucun fournisseur LLM disponible — ${errors.join(" | ")}`);
}

/**
 * Transforms an upstream OpenAI-style SSE response into a client byte stream.
 * `format` maps each content delta to the text emitted to the client, and the
 * optional `doneMarker` is emitted once the upstream completes.
 */
export function transformDeltaStream(
  upstream: Response,
  format: (delta: string) => string,
  doneMarker?: string
): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          if (doneMarker) controller.enqueue(encoder.encode(doneMarker));
          controller.close();
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
          // Upstream signals completion: emit our done marker and close now,
          // rather than waiting for the socket to close (some providers keep
          // the connection open after [DONE], which would hang the client).
          if (data === "[DONE]") {
            if (doneMarker) controller.enqueue(encoder.encode(doneMarker));
            controller.close();
            reader.cancel().catch(() => {});
            return;
          }

          try {
            const json = JSON.parse(data);
            const delta: string | undefined = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(format(delta)));
            // Some providers omit [DONE] and instead set a finish_reason.
            const finish: string | null | undefined =
              json.choices?.[0]?.finish_reason;
            if (finish) {
              if (doneMarker) controller.enqueue(encoder.encode(doneMarker));
              controller.close();
              reader.cancel().catch(() => {});
              return;
            }
          } catch {
            // Ignore keep-alive comments and non-JSON lines.
          }
        }
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
