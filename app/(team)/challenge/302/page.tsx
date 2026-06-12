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
  UC2_SCENARIOS,
  UC2_DEBRIEF_PROMPT,
  UC2_MAX_TURNS,
  type Uc2Scenario,
} from "@/lib/ai/usecase-prompts";
import type { GeneralVerdict } from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
} from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 302;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

type Phase = "select" | "chat" | "result";

/** Sépare le retour du coach du bloc « VERDICT: {...} » final. */
function splitDebrief(raw: string): { feedback: string; verdict: GeneralVerdict | null } {
  const m = raw.match(/VERDICT\s*:\s*(\{.*\})/s);
  const feedback = raw.replace(/VERDICT\s*:[\s\S]*$/, "").trim();
  if (!m) return { feedback, verdict: null };
  try {
    const v = JSON.parse(m[1]) as {
      preparation: number;
      clarte: number;
      posture: number;
      point_fort?: string;
      a_ameliorer?: string;
      conseil?: string;
    };
    const prep = Math.max(0, Math.min(8, v.preparation ?? 0));
    const clarte = Math.max(0, Math.min(6, v.clarte ?? 0));
    const posture = Math.max(0, Math.min(6, v.posture ?? 0));
    return {
      feedback,
      verdict: {
        total: prep + clarte + posture,
        details: [
          { label: "Préparation", score: prep, max: 8 },
          { label: "Clarté", score: clarte, max: 6 },
          { label: "Posture", score: posture, max: 6 },
        ],
        point_fort: v.point_fort,
        a_ameliorer: v.a_ameliorer,
        conseil: v.conseil,
      },
    };
  } catch {
    return { feedback, verdict: null };
  }
}

export default function Uc2Page() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("select");
  const [scenario, setScenario] = useState<Uc2Scenario | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [appropriation, setAppropriation] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const startScenario = useCallback(
    async (s: Uc2Scenario) => {
      if (!teamId) return;
      setScenario(s);
      setPhase("chat");
      setStreaming(true);
      setMessages([{ role: "assistant", content: "" }]);
      let txt = "";
      await streamFromProxy({
        systemPrompt: s.system,
        messages: [
          {
            role: "user",
            content:
              "Bonjour, je suis prêt·e pour l'entretien. Accueillez-moi et posez votre première question.",
          },
        ],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 500,
        onChunk: (t) => {
          txt += t;
          setMessages([{ role: "assistant", content: txt }]);
        },
        onDone: () => setStreaming(false),
        onError: () => setStreaming(false),
      });
    },
    [teamId]
  );

  const runDebrief = useCallback(
    async (convo: Msg[]) => {
      if (!teamId || !scenario) return;
      setEvaluating(true);
      setPhase("result");
      const transcript = convo
        .map((m) => `${m.role === "user" ? "Candidat" : "Interlocuteur"} : ${m.content}`)
        .join("\n");
      const prompt = UC2_DEBRIEF_PROMPT.replace("{SCENARIO}", scenario.label).replace(
        "{TRANSCRIPT}",
        transcript
      );
      let txt = "";
      await streamFromProxy({
        systemPrompt: prompt,
        messages: [{ role: "user", content: "Fais le débrief maintenant." }],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 900,
        onChunk: (t) => {
          txt += t;
          setFeedback(txt.replace(/VERDICT\s*:[\s\S]*$/, "").trim());
        },
        onDone: () => {
          const { feedback: fb, verdict: v } = splitDebrief(txt);
          setFeedback(fb);
          setVerdict(v);
          setEvaluating(false);
        },
        onError: () => setEvaluating(false),
      });
    },
    [teamId, scenario]
  );

  const handleSend = useCallback(async () => {
    if (!teamId || !scenario || streaming || !input.trim()) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const convo = [...messages, userMsg];
    setMessages(convo);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let txt = "";
    await streamFromProxy({
      systemPrompt: scenario.system,
      messages: convo,
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 500,
      onChunk: (t) => {
        txt += t;
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: txt };
          return u;
        });
      },
      onDone: () => {
        const finalConvo: Msg[] = [...convo, { role: "assistant", content: txt }];
        setMessages(finalConvo);
        const newTurns = turns + 1;
        setTurns(newTurns);
        setStreaming(false);
        if (newTurns >= UC2_MAX_TURNS) runDebrief(finalConvo);
      },
      onError: () => setStreaming(false),
    });
  }, [teamId, scenario, streaming, input, messages, turns, runDebrief]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      scenario: scenario?.id,
      turns,
      messages,
      feedback,
      appropriation,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, scenario, turns, messages, feedback, appropriation, verdict]);

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
              Cas d&apos;usage 2 — Le simulateur d&apos;entretien
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Mettez-vous à la place de la personne accompagnée : testez l&apos;outil.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={1200} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        {phase === "select" && (
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-black">Choisissez la situation</h2>
            <p className="text-[#4A4A4A]">
              L&apos;IA joue l&apos;interlocuteur (jury, employeur, RH) — jamais la
              personne accompagnée. C&apos;est vous qui jouez le candidat,
              comme le ferait une personne que vous accompagnez.
            </p>
            {UC2_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => startScenario(s)}
                className="text-left border-2 border-black p-4 hover:border-[#2D5A3D]"
              >
                <span className="font-bold text-black text-lg">{s.label}</span>
                <span className="block text-[#4A4A4A] mt-1">{s.brief}</span>
              </button>
            ))}
          </section>
        )}

        {(phase === "chat" || phase === "result") && scenario && (
          <>
            <p className="text-sm text-[#4A4A4A] mb-2">
              <strong className="text-black">{scenario.label}</strong> — échange{" "}
              {Math.min(turns, UC2_MAX_TURNS)}/{UC2_MAX_TURNS}
            </p>

            {/* Chat */}
            <div className="border-2 border-black p-4 mb-4 min-h-[280px] max-h-[460px] overflow-y-auto flex flex-col gap-4">
              {messages.map((m, i) => (
                <div key={i}>
                  <span className="text-xs text-[#B8B8B8]">
                    {m.role === "user" ? "Vous (candidat)" : "Interlocuteur"}
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
                  L&apos;interlocuteur réfléchit…
                </span>
              )}
            </div>

            {phase === "chat" && (
              <>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={streaming}
                    placeholder="Votre réponse de candidat…"
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
                {turns >= 2 && !streaming && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => runDebrief(messages)}
                      className="px-5 py-2 bg-white text-[#2D5A3D] font-semibold border-2 border-[#2D5A3D]"
                    >
                      Terminer l&apos;entretien et recevoir le débrief
                    </button>
                  </div>
                )}
              </>
            )}

            {phase === "result" && (
              <section className="mt-4">
                <h2 className="text-2xl font-bold text-black mb-3">
                  Le débrief du coach
                </h2>
                {feedback ? (
                  <div className="border-2 border-black p-5 mb-5">
                    <Markdown content={feedback} />
                  </div>
                ) : (
                  <p className="text-center text-[#4A4A4A] mb-5">
                    Débrief en cours…
                  </p>
                )}
                {!evaluating && verdict && <Verdict verdict={verdict} />}

                {!evaluating && (
                  <>
                    <label className="block font-bold text-black mt-6 mb-2">
                      Et maintenant, le regard pro : confieriez-vous cet
                      entraînement à une personne que vous accompagnez ?
                      Quelles précautions ?
                    </label>
                    <textarea
                      value={appropriation}
                      onChange={(e) => setAppropriation(e.target.value)}
                      rows={3}
                      placeholder="Ex : oui pour dédramatiser, mais accompagné·e la première fois, et jamais comme seul entraînement…"
                      className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none"
                    />
                    <div className="flex justify-center mt-6">
                      <SubmitButton
                        state={submitState}
                        onClick={handleSubmit}
                        label="Valider"
                        disabled={!appropriation.trim()}
                      />
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
