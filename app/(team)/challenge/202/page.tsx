"use client";

import { useState, useCallback } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Markdown from "@/components/shared/Markdown";
import SubmitButton from "@/components/shared/SubmitButton";
import Verdict from "@/components/challenges/general/Verdict";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  GEN_B_PERSONAS,
  GEN_B_EVAL_PROMPT,
  GEN_B_THRESHOLD,
  GEN_B_START_GAUGE,
  GEN_B_MAX_TURNS,
  type GenBPersona,
  type GeneralVerdict,
} from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
} from "@/lib/challenges/general-helpers";
import {
  parseJsonObject,
  extractGauge,
  stripGauge,
  stripGaugeStreaming,
} from "@/lib/challenges/general-pure";

const CHALLENGE_ID = 202;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

type Phase = "select" | "chat" | "result";

export default function GenBPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("select");
  const [persona, setPersona] = useState<GenBPersona | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [gauge, setGauge] = useState(GEN_B_START_GAUGE);
  const [turns, setTurns] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const runEvaluation = useCallback(
    async (finalGauge: number, finalTurns: number, convo: Msg[]) => {
      if (!teamId || !persona) return;
      setEvaluating(true);
      setPhase("result");
      const transcript = convo
        .map((m) => `${m.role === "user" ? "Équipe" : persona.label} : ${m.content}`)
        .join("\n");
      const prompt = GEN_B_EVAL_PROMPT.replace("{PERSONA}", persona.label)
        .replace("{JAUGE}", String(finalGauge))
        .replace("{TOURS}", String(finalTurns))
        .replace("{TRANSCRIPT}", transcript);
      let txt = "";
      await streamFromProxy({
        systemPrompt: prompt,
        messages: [{ role: "user", content: "Évalue maintenant." }],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 700,
        onChunk: (t) => {
          txt += t;
        },
        onDone: () => {
          const raw = parseJsonObject<{
            argumentation: number;
            posture: number;
            point_fort?: string;
            a_ameliorer?: string;
            conseil?: string;
          }>(txt);
          const objective =
            finalGauge >= GEN_B_THRESHOLD
              ? 8
              : Math.round((8 * finalGauge) / GEN_B_THRESHOLD);
          const arg = raw?.argumentation ?? 0;
          const pos = raw?.posture ?? 0;
          setVerdict({
            total: objective + arg + pos,
            details: [
              { label: "Objectif (jauge)", score: objective, max: 8 },
              { label: "Argumentation", score: arg, max: 6 },
              { label: "Posture", score: pos, max: 6 },
            ],
            point_fort: raw?.point_fort,
            a_ameliorer: raw?.a_ameliorer,
            conseil: raw?.conseil,
          });
          setEvaluating(false);
        },
        onError: () => setEvaluating(false),
      });
    },
    [teamId, persona]
  );

  const handleSend = useCallback(async () => {
    if (!teamId || !persona || streaming || !input.trim()) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const convo = [...messages, userMsg];
    setMessages(convo);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let raw = "";
    await streamFromProxy({
      systemPrompt: persona.system,
      messages: convo,
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 600,
      onChunk: (t) => {
        raw += t;
        const shown = stripGaugeStreaming(raw);
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: shown };
          return u;
        });
      },
      onDone: () => {
        const newGauge = extractGauge(raw) ?? gauge;
        const shown = stripGauge(raw);
        const finalConvo: Msg[] = [...convo, { role: "assistant", content: shown }];
        setMessages(finalConvo);
        setGauge(newGauge);
        const newTurns = turns + 1;
        setTurns(newTurns);
        setStreaming(false);
        if (newGauge >= GEN_B_THRESHOLD || newTurns >= GEN_B_MAX_TURNS) {
          runEvaluation(newGauge, newTurns, finalConvo);
        }
      },
      onError: () => setStreaming(false),
    });
  }, [teamId, persona, streaming, input, messages, gauge, turns, runEvaluation]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      persona: persona?.id,
      gauge,
      turns,
      messages,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, persona, gauge, turns, messages, verdict]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-black">
              Défi B — Le client mystère
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Faites évoluer la position de votre interlocuteur.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={840} startedAt={startedAt} />
          </div>
        </div>

        {phase === "select" && (
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-black">Choisissez votre interlocuteur</h2>
            {GEN_B_PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPersona(p);
                  setPhase("chat");
                }}
                className="text-left border-2 border-black p-4 hover:border-[#2D5A3D]"
              >
                <span className="font-bold text-black text-lg">{p.label}</span>
                <span className="block text-[#4A4A4A] mt-1">{p.brief}</span>
              </button>
            ))}
          </section>
        )}

        {(phase === "chat" || phase === "result") && persona && (
          <>
            {/* Gauge */}
            <div className="mb-4">
              <div className="flex justify-between text-sm font-semibold mb-1">
                <span className="text-black">{persona.label}</span>
                <span className="text-[#2D5A3D]">
                  Jauge {gauge}/100 · objectif {GEN_B_THRESHOLD}
                </span>
              </div>
              <div className="h-4 border-2 border-black bg-white">
                <div
                  className="h-full bg-[#2D5A3D] transition-all"
                  style={{ width: `${gauge}%` }}
                />
              </div>
              <p className="text-xs text-[#4A4A4A] mt-1">
                Échange {Math.min(turns, GEN_B_MAX_TURNS)}/{GEN_B_MAX_TURNS}
              </p>
            </div>

            {/* Chat */}
            <div className="border-2 border-black p-4 mb-4 min-h-[280px] max-h-[460px] overflow-y-auto flex flex-col gap-4">
              {messages.length === 0 && (
                <p className="text-[#B8B8B8]">{persona.brief}</p>
              )}
              {messages.map((m, i) => (
                <div key={i}>
                  <span className="text-xs text-[#B8B8B8]">
                    {m.role === "user" ? "Vous" : persona.label}
                  </span>
                  {m.role === "assistant" ? (
                    <Markdown content={m.content} />
                  ) : (
                    <p className="text-[#2D5A3D] font-semibold whitespace-pre-wrap">
                      {m.content}
                    </p>
                  )}
                </div>
              ))}
              {streaming && messages[messages.length - 1]?.content === "" && (
                <span className="text-[#B8B8B8] animate-pulse">
                  {persona.label} réfléchit…
                </span>
              )}
            </div>

            {phase === "chat" && (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={streaming}
                  placeholder="Votre argument…"
                  className="flex-1 border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={streaming || !input.trim()}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
                >
                  Envoyer
                </button>
              </div>
            )}

            {phase === "result" && (
              <section className="mt-4">
                <p className="text-center text-xl font-bold mb-4 text-black">
                  {gauge >= GEN_B_THRESHOLD
                    ? "Objectif atteint ! 🎉"
                    : "Conversation terminée."}
                </p>
                {evaluating && !verdict ? (
                  <p className="text-center text-[#4A4A4A]">Évaluation en cours…</p>
                ) : verdict ? (
                  <Verdict verdict={verdict} />
                ) : null}
                <div className="flex justify-center mt-6">
                  <SubmitButton
                    state={submitState}
                    onClick={handleSubmit}
                    label="Valider"
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
