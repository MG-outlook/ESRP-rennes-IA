interface ProxyMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamFromProxyOptions {
  systemPrompt?: string;
  messages: ProxyMessage[];
  challengeId?: number;
  teamId?: string | null;
  onToken?: (token: string) => void;
  onChunk?: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export async function streamFromProxy({
  systemPrompt,
  messages,
  challengeId,
  teamId,
  onToken,
  onChunk,
  onDone,
  onError,
}: StreamFromProxyOptions): Promise<string> {
  try {
  const response = await fetch("/api/ai-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      system_prompt: systemPrompt,
      messages,
      challenge_id: challengeId,
      team_id: teamId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erreur IA (${response.status})`);
  }

  if (!response.body) {
    const text = await response.text();
    onDone?.(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onToken?.(chunk);
    onChunk?.(chunk);
  }

  onDone?.(fullText);
  return fullText;
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    onError?.(error);
    throw error;
  }
}
