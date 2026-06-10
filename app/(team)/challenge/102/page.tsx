"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import SubmitButton from "@/components/shared/SubmitButton";
import Markdown from "@/components/shared/Markdown";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_B_COACH_PROMPT } from "@/lib/ai/prompts";

const CHALLENGE_ID = 102;
const MAX_ROUNDS = 3;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function BonusBPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [round, setRound] = useState(0);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: session } = await supabase
        .from("team_sessions")
        .select("team_id")
        .eq("auth_uid", user.id)
        .single();
      if (!session) return;
      setTeamId(session.team_id);

      const { data: progress } = await supabase
        .from("team_progress")
        .select("started_at")
        .eq("team_id", session.team_id)
        .eq("challenge_id", CHALLENGE_ID)
        .single();
      if (progress?.started_at) {
        setStartedAt(progress.started_at);
      } else {
        const now = new Date().toISOString();
        await supabase.from("team_progress").upsert({
          team_id: session.team_id,
          challenge_id: CHALLENGE_ID,
          started_at: now,
        });
        setStartedAt(now);
      }
    }
    init();
  }, []);

  // Start with first question
  useEffect(() => {
    if (teamId && messages.length === 0 && !streaming) {
      sendToCoach([]);
    }
  }, [teamId]);

  const sendToCoach = useCallback(async (history: Message[]) => {
    if (!teamId) return;
    setStreaming(true);

    const allMessages: Message[] = [
      ...history,
    ];

    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    await streamFromProxy({
      systemPrompt: BONUS_B_COACH_PROMPT,
      messages: allMessages.length === 0
        ? [{ role: "user", content: "Commence l'entretien. Pose ta première question." }]
        : allMessages,
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => {
        assistantText += t;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      },
      onDone: () => setStreaming(false),
      onError: () => setStreaming(false),
    });
  }, [teamId]);

  const handleSend = useCallback(() => {
    if (!input.trim() || streaming || round >= MAX_ROUNDS) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setRound((r) => r + 1);
    sendToCoach(newMessages);
  }, [input, streaming, round, messages, sendToCoach]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { messages, rounds: round },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
  }, [teamId, submitState, messages, round]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              Bonus B — Le coach d&apos;entretien
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              3 questions, 3 réponses. Préparez Camille à son entretien.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={900} startedAt={startedAt} />
          </div>
        </div>

        {/* Chat */}
        <div className="border-2 border-black p-6 mb-6 min-h-[300px] max-h-[500px] overflow-y-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${
                msg.role === "assistant" ? "text-black" : "text-[#2D5A3D] font-semibold"
              }`}
            >
              <span className="text-sm text-[#B8B8B8]">
                {msg.role === "assistant" ? "Coach" : "Vous"}
              </span>
              {msg.role === "assistant" ? (
                <Markdown content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
          ))}
          {streaming && messages.length > 0 && !messages[messages.length - 1].content && (
            <span className="text-[#B8B8B8] animate-pulse">Le coach réfléchit...</span>
          )}
        </div>

        {/* Input */}
        {round < MAX_ROUNDS && !streaming && (
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={`Réponse ${round + 1}/${MAX_ROUNDS}...`}
              className="flex-1 border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        )}

        {round >= MAX_ROUNDS && !streaming && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
