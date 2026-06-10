import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChatResponse, type ChatMessage } from "@/lib/ai/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ProxyBody {
  system_prompt?: string;
  messages?: { role?: string; content?: string }[];
  max_tokens?: number;
  health_check?: boolean;
}

export async function POST(req: NextRequest) {
  // Require an authenticated (anonymous) team session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: ProxyBody;
  try {
    body = (await req.json()) as ProxyBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  if (body.system_prompt) {
    messages.push({ role: "system", content: body.system_prompt });
  }
  for (const m of body.messages ?? []) {
    if (
      m &&
      typeof m.content === "string" &&
      (m.role === "user" || m.role === "assistant" || m.role === "system")
    ) {
      messages.push({ role: m.role, content: m.content });
    }
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "Aucun message" }, { status: 400 });
  }

  // Stream is returned immediately; the provider connection happens inside it
  // so Vercel's gateway never 504s while the model warms up. The client
  // (lib/ai/proxy.ts) reads the body as a raw text stream, so the heartbeat is
  // a leading space (harmless whitespace) rather than an SSE comment.
  const stream = streamChatResponse(
    {
      messages,
      maxTokens: body.health_check ? 5 : body.max_tokens ?? 4000,
      temperature: 0.5,
      signal: req.signal,
    },
    (delta) => delta,
    undefined,
    " "
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
