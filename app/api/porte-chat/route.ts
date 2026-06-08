import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  openChatStream,
  transformDeltaStream,
  type ChatMessage,
} from "@/lib/ai/llm";
import { GARDIEN_SYSTEM_PROMPT } from "@/lib/ai/porte-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PorteBody {
  messages?: { role?: string; content?: string }[];
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

  let body: PorteBody;
  try {
    body = (await req.json()) as PorteBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const convo: ChatMessage[] = [
    { role: "system", content: GARDIEN_SYSTEM_PROMPT },
  ];
  for (const m of body.messages ?? []) {
    if (
      m &&
      typeof m.content === "string" &&
      (m.role === "user" || m.role === "assistant")
    ) {
      convo.push({ role: m.role, content: m.content });
    }
  }

  try {
    const upstream = await openChatStream({
      messages: convo,
      maxTokens: 1024,
      temperature: 0.7,
      signal: req.signal,
    });

    // The porte page expects OpenAI-style SSE: data: {choices:[{delta:{content}}]}
    const stream = transformDeltaStream(
      upstream,
      (delta) =>
        `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`,
      "data: [DONE]\n\n"
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    console.error("porte-chat failed:", e);
    return NextResponse.json(
      { error: "Service IA indisponible" },
      { status: 502 }
    );
  }
}
