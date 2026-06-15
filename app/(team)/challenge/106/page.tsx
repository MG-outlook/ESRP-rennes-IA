"use client";

import { useState, useCallback } from "react";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Spinner from "@/components/shared/Spinner";
import Markdown from "@/components/shared/Markdown";
import SubmitButton from "@/components/shared/SubmitButton";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  BONUS_F_JOURNAL_PROMPT,
  BONUS_F_MOMENTS,
  BONUS_F_FEEDBACK_PROMPT,
} from "@/lib/ai/prompts";
import { useChallengeInit, finishChallenge } from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 106;
const MAX_ATTEMPTS = 3;

interface Attempt {
  prompt: string;
  output: string;
}

type Phase = "write" | "choose" | "result";

export default function BonusFPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("write");
  const [moment, setMoment] = useState("");
  const [prompt, setPrompt] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reflection, setReflection] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const handleRun = useCallback(async () => {
    if (!teamId || running || !moment.trim() || !prompt.trim()) return;
    if (attempts.length >= MAX_ATTEMPTS) return;
    const usedPrompt = prompt.trim();
    setRunning(true);
    setStreamingText("");
    let txt = "";
    await streamFromProxy({
      systemPrompt: BONUS_F_JOURNAL_PROMPT,
      messages: [
        {
          role: "user",
          content: `Moment choisi : ${moment.trim()}\n\nConsigne de l'équipe : ${usedPrompt}`,
        },
      ],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 1200,
      onChunk: (t) => {
        txt += t;
        setStreamingText(txt);
      },
      onDone: () => {
        setAttempts((prev) => [...prev, { prompt: usedPrompt, output: txt.trim() }]);
        setStreamingText("");
        setRunning(false);
      },
      onError: () => setRunning(false),
    });
  }, [teamId, running, moment, prompt, attempts.length]);

  const handleChoose = useCallback(async () => {
    if (!teamId || selected === null) return;
    const chosen = attempts[selected];
    if (!chosen) return;
    setPhase("result");
    setFeedback("");
    await streamFromProxy({
      systemPrompt: BONUS_F_FEEDBACK_PROMPT.replace("{FRAGMENT}", chosen.output),
      messages: [{ role: "user", content: "Donne ton regard sur ce fragment." }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 400,
      onChunk: (t) => setFeedback((p) => p + t),
      onDone: () => {},
      onError: () => {},
    });
  }, [teamId, selected, attempts]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle" || selected === null) return;
    setSubmitState("loading");
    const chosen = attempts[selected];
    await finishChallenge(CHALLENGE_ID, teamId, {
      moment,
      prompt: chosen?.prompt ?? null,
      journal: chosen?.output ?? null,
      attempts,
      feedback,
      reflection,
    });
    setSubmitState("done");
  }, [teamId, submitState, selected, attempts, moment, feedback, reflection]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  const attemptsLeft = MAX_ATTEMPTS - attempts.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-black">
              Bonus F — Le journal de Camille
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Dirigez l&apos;IA pour écrire, à la première personne, un fragment
              juste et digne — puis choisissez le meilleur.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={720} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        {/* Phase 1 : moment + prompt + essais */}
        {phase === "write" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-3">Choisissez un moment</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {BONUS_F_MOMENTS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMoment(m)}
                  disabled={running}
                  className={`px-3 py-2 border-2 text-sm font-semibold ${
                    moment === m
                      ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                      : "bg-white border-black text-black"
                  } disabled:opacity-50`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={moment}
              onChange={(e) => setMoment(e.target.value)}
              disabled={running}
              placeholder="…ou décrivez votre propre moment"
              className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50 mb-5"
            />

            <label className="block font-bold text-black mb-2">
              Votre consigne à l&apos;IA
            </label>
            <p className="text-sm text-[#4A4A4A] mb-2">
              Dites comment Camille doit se raconter : l&apos;émotion dominante, ce
              qu&apos;elle réalise, le ton à éviter. C&apos;est votre prompt qui fait
              la justesse du texte.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={running || attempts.length >= MAX_ATTEMPTS}
              placeholder="Ex : un mélange de fatigue et de fierté discrète, sans pathos ; elle réalise qu'elle a osé prendre la parole…"
              className="w-full border-2 border-black p-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <span className="text-sm text-[#4A4A4A]">
                {attemptsLeft > 0
                  ? `Essais restants : ${attemptsLeft} / ${MAX_ATTEMPTS}`
                  : "Vous avez utilisé vos 3 essais."}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handleRun}
                  disabled={
                    running ||
                    !moment.trim() ||
                    !prompt.trim() ||
                    attempts.length >= MAX_ATTEMPTS
                  }
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50"
                >
                  {running
                    ? "Écriture…"
                    : `Lancer l'essai ${Math.min(attempts.length + 1, MAX_ATTEMPTS)}/${MAX_ATTEMPTS}`}
                </button>
                {attempts.length > 0 && (
                  <button
                    onClick={() => {
                      setSelected(null);
                      setPhase("choose");
                    }}
                    disabled={running}
                    className="px-6 py-3 bg-white text-[#2D5A3D] font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50"
                  >
                    Comparer et choisir →
                  </button>
                )}
              </div>
            </div>

            {running && (
              <div className="mt-6">
                <h3 className="font-bold text-black mb-1">
                  Essai {attempts.length + 1} — en cours
                </h3>
                <div className="border-2 border-[#2D5A3D] p-4 min-h-[100px] italic">
                  {streamingText ? (
                    <Markdown content={streamingText} />
                  ) : (
                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                      <Spinner size="sm" />
                      <span>Camille prend la plume…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!running && attempts.length > 0 && (
              <div className="mt-6 flex flex-col gap-4">
                <h3 className="font-bold text-black">
                  Vos essais ({attempts.length}/{MAX_ATTEMPTS})
                </h3>
                {attempts.map((a, i) => (
                  <div key={i} className="border-2 border-black p-4 italic">
                    <p className="text-sm font-bold text-[#2D5A3D] mb-2 not-italic">
                      Essai {i + 1}
                    </p>
                    <Markdown content={a.output} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Phase 2 : choisir le fragment le plus juste */}
        {phase === "choose" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Choisissez le fragment le plus juste
            </h2>
            <p className="text-[#4A4A4A] mb-5">
              Lequel donne à Camille la voix la plus digne et la plus nuancée,
              sans caricature ni pathos ?
            </p>

            <div className="flex flex-col gap-4">
              {attempts.map((a, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    aria-pressed={isSelected}
                    className={`text-left border-2 p-4 italic transition-colors ${
                      isSelected
                        ? "border-[#2D5A3D] bg-[#F0F5F1]"
                        : "border-black bg-white hover:border-[#2D5A3D]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 not-italic">
                      <span className="text-sm font-bold text-[#2D5A3D]">
                        Essai {i + 1}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[#2D5A3D]" : "text-[#B8B8B8]"
                        }`}
                      >
                        {isSelected ? "✓ Choisi" : "Choisir ce fragment"}
                      </span>
                    </div>
                    <Markdown content={a.output} />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-between gap-3 mt-6">
              {attempts.length < MAX_ATTEMPTS && (
                <button
                  onClick={() => setPhase("write")}
                  className="px-5 py-3 bg-white text-black font-semibold border-2 border-black"
                >
                  ← Refaire un essai
                </button>
              )}
              <button
                onClick={handleChoose}
                disabled={selected === null}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50 ml-auto"
              >
                Valider mon choix
              </button>
            </div>
          </section>
        )}

        {/* Phase 3 : regard de l'IA + réflexion de l'équipe */}
        {phase === "result" && (
          <section className="mb-8">
            {selected !== null && attempts[selected] && (
              <div className="border-2 border-black p-4 mb-6 italic">
                <h3 className="font-bold text-black mb-2 not-italic">
                  Le fragment retenu
                </h3>
                <Markdown content={attempts[selected].output} />
              </div>
            )}

            <div className="border-l-4 border-[#2D5A3D] bg-[#F0F5F1] p-4 mb-6">
              <h3 className="font-bold text-[#2D5A3D] mb-1">Le regard de l&apos;IA</h3>
              {feedback ? (
                <Markdown content={feedback} />
              ) : (
                <div className="flex items-center gap-2 text-[#4A4A4A]">
                  <Spinner size="sm" />
                  <span>Lecture du fragment…</span>
                </div>
              )}
            </div>

            <label className="block font-bold text-black mb-2">
              Et vous : qu&apos;est-ce que ce changement de point de vue vous fait
              comprendre ?
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="En écrivant « je » à la place de Camille, nous avons réalisé que…"
              className="w-full border-2 border-black p-3 text-black focus:border-[#2D5A3D] focus:outline-none"
            />

            <div className="flex justify-center mt-6">
              <SubmitButton
                state={submitState}
                onClick={handleSubmit}
                label="Valider"
                disabled={!reflection.trim()}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
