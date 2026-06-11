"use client";

import { useState, useCallback } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Spinner from "@/components/shared/Spinner";
import SubmitButton from "@/components/shared/SubmitButton";
import Markdown from "@/components/shared/Markdown";
import Verdict from "@/components/challenges/general/Verdict";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  GEN_D_ORIGINAL,
  GEN_D_SYSTEM_PROMPT,
  GEN_D_EVAL_PROMPT,
  type GeneralVerdict,
} from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
  parseJsonObject,
} from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 204;
const MAX_ATTEMPTS = 3;

interface Attempt {
  prompt: string;
  output: string;
}

type Phase = "write" | "choose" | "result";

export default function GenDPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("write");
  const [prompt, setPrompt] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const handleRun = useCallback(async () => {
    if (!teamId || running || !prompt.trim() || attempts.length >= MAX_ATTEMPTS)
      return;
    const usedPrompt = prompt.trim();
    setRunning(true);
    setStreamingText("");
    let txt = "";
    await streamFromProxy({
      systemPrompt: GEN_D_SYSTEM_PROMPT,
      messages: [{ role: "user", content: usedPrompt }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 1500,
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
  }, [teamId, running, prompt, attempts.length]);

  const handleEvaluate = useCallback(async () => {
    if (!teamId || selected === null || evaluating) return;
    const chosen = attempts[selected];
    if (!chosen) return;
    setEvaluating(true);
    setPhase("result");

    const evalPrompt = GEN_D_EVAL_PROMPT.replace("{ORIGINAL}", GEN_D_ORIGINAL)
      .replace("{PROMPT}", chosen.prompt)
      .replace("{RESULTAT}", chosen.output);
    let txt = "";
    await streamFromProxy({
      systemPrompt: evalPrompt,
      messages: [{ role: "user", content: "Évalue maintenant." }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 800,
      onChunk: (t) => {
        txt += t;
      },
      onDone: () => {
        setVerdict(parseJsonObject<GeneralVerdict>(txt));
        setEvaluating(false);
      },
      onError: () => setEvaluating(false),
    });
  }, [teamId, selected, evaluating, attempts]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle" || selected === null) return;
    setSubmitState("loading");
    const chosen = attempts[selected];
    await finishChallenge(CHALLENGE_ID, teamId, {
      prompt: chosen?.prompt ?? null,
      chosenOutput: chosen?.output ?? null,
      attempts,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, selected, attempts, verdict]);

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
              Défi D — Le caméléon
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Un même message, trois publics — sans trahir le sens.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={840} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-2xl font-bold text-black mb-3">La note d&apos;origine</h2>
          <div className="border-2 border-black p-5 bg-[#F5F5F5] whitespace-pre-line text-black leading-relaxed">
            {GEN_D_ORIGINAL}
          </div>
          <p className="text-sm text-[#4A4A4A] mt-3">
            Objectif : obtenir <strong>trois versions</strong> de cette note — une
            pour l&apos;équipe (registre pro), une pour une personne accompagnée
            (FALC), une pour un partenaire extérieur — <strong>sans rien trahir</strong>.
            À vous d&apos;écrire le prompt.
          </p>
        </section>

        {/* Phase 1 : l'équipe rédige et teste son prompt (jusqu'à 3 essais) */}
        {phase === "write" && (
          <section className="mb-8">
            <label className="block font-bold text-black mb-2">
              Votre prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              disabled={running || attempts.length >= MAX_ATTEMPTS}
              placeholder="Écrivez ici la consigne que l'IA devra suivre pour produire les trois versions…"
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
                  disabled={running || !prompt.trim() || attempts.length >= MAX_ATTEMPTS}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50"
                >
                  {running
                    ? "Génération…"
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
                <div className="border-2 border-[#2D5A3D] p-4 min-h-[100px]">
                  {streamingText ? (
                    <Markdown content={streamingText} />
                  ) : (
                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                      <Spinner size="sm" />
                      <span>L&apos;IA applique votre prompt…</span>
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
                  <div key={i} className="border-2 border-black p-4">
                    <p className="text-sm font-bold text-[#2D5A3D] mb-2">
                      Essai {i + 1}
                    </p>
                    <p className="text-xs text-[#4A4A4A] mb-3 italic whitespace-pre-line">
                      Prompt : {a.prompt}
                    </p>
                    <Markdown content={a.output} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Phase 2 : comparer les essais et choisir le meilleur */}
        {phase === "choose" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Comparez et choisissez
            </h2>
            <p className="text-[#4A4A4A] mb-5">
              Sélectionnez l&apos;essai qui adapte le mieux la note aux trois
              publics. C&apos;est lui qui sera évalué.
            </p>

            <div className="flex flex-col gap-4">
              {attempts.map((a, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    aria-pressed={isSelected}
                    className={`text-left border-2 p-4 transition-colors ${
                      isSelected
                        ? "border-[#2D5A3D] bg-[#F0F5F1]"
                        : "border-black bg-white hover:border-[#2D5A3D]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-[#2D5A3D]">
                        Essai {i + 1}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[#2D5A3D]" : "text-[#B8B8B8]"
                        }`}
                      >
                        {isSelected ? "✓ Choisi" : "Choisir cet essai"}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A4A4A] mb-3 italic whitespace-pre-line">
                      Prompt : {a.prompt}
                    </p>
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
                onClick={handleEvaluate}
                disabled={selected === null}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50 ml-auto"
              >
                Valider mon choix et faire évaluer
              </button>
            </div>
          </section>
        )}

        {/* Phase 3 : évaluation et points */}
        {phase === "result" && (
          <section className="mb-8">
            {selected !== null && attempts[selected] && (
              <div className="border-2 border-black p-4 mb-6">
                <h3 className="font-bold text-black mb-2">Votre version retenue</h3>
                <p className="text-xs text-[#4A4A4A] mb-3 italic whitespace-pre-line">
                  Prompt : {attempts[selected].prompt}
                </p>
                <Markdown content={attempts[selected].output} />
              </div>
            )}

            {evaluating && !verdict ? (
              <p className="text-center text-[#4A4A4A]">Évaluation en cours…</p>
            ) : verdict ? (
              <Verdict verdict={verdict} />
            ) : (
              <p className="text-[#8B3A3A]">Évaluation indisponible.</p>
            )}

            <div className="flex justify-center mt-6">
              <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
