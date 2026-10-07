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
import Icon from "@/components/shared/Icon";

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
    <div className="flex-1 bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-ink">
              Défi D — Le caméléon
            </h1>
            <p className="text-ink-2 mt-2">
              Un même message, trois publics — sans trahir le sens.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={840} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-2xl font-bold text-ink mb-3">La note d&apos;origine</h2>
          <div className="border p-5 bg-surface whitespace-pre-line text-ink leading-relaxed border-line">
            {GEN_D_ORIGINAL}
          </div>
          <p className="text-sm text-ink-2 mt-3">
            Objectif : obtenir <strong>trois versions</strong> de cette note — une
            pour l&apos;équipe (registre pro), une pour une personne accompagnée
            (FALC), une pour un partenaire extérieur — <strong>sans rien trahir</strong>.
            À vous d&apos;écrire le prompt.
          </p>
        </section>

        {/* Phase 1 : l'équipe rédige et teste son prompt (jusqu'à 3 essais) */}
        {phase === "write" && (
          <section className="mb-8">
            <label className="block font-bold text-ink mb-2">
              Votre prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              disabled={running || attempts.length >= MAX_ATTEMPTS}
              placeholder="Écrivez ici la consigne que l'IA devra suivre pour produire les trois versions…"
              className="field w-full p-3 disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <span className="text-sm text-ink-2">
                {attemptsLeft > 0
                  ? `Essais restants : ${attemptsLeft} / ${MAX_ATTEMPTS}`
                  : "Vous avez utilisé vos 3 essais."}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handleRun}
                  disabled={running || !prompt.trim() || attempts.length >= MAX_ATTEMPTS}
                  className="btn btn-primary px-6 py-3 text-lg disabled:opacity-50"
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
                    className="btn btn-secondary px-6 py-3 text-lg disabled:opacity-50"
                  >
                    Comparer et choisir →
                  </button>
                )}
              </div>
            </div>

            {running && (
              <div className="mt-6">
                <h3 className="font-bold text-ink mb-1">
                  Essai {attempts.length + 1} — en cours
                </h3>
                <div className="border-2 border-brand p-4 min-h-[100px]">
                  {streamingText ? (
                    <Markdown content={streamingText} />
                  ) : (
                    <div className="flex items-center gap-2 text-ink-2">
                      <Spinner size="sm" />
                      <span>L&apos;IA applique votre prompt…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!running && attempts.length > 0 && (
              <div className="mt-6 flex flex-col gap-4">
                <h3 className="font-bold text-ink">
                  Vos essais ({attempts.length}/{MAX_ATTEMPTS})
                </h3>
                {attempts.map((a, i) => (
                  <div key={i} className="border p-4 border-line">
                    <p className="text-sm font-bold text-brand mb-2">
                      Essai {i + 1}
                    </p>
                    <p className="text-xs text-ink-2 mb-3 italic whitespace-pre-line">
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
            <h2 className="text-2xl font-bold text-ink mb-2">
              Comparez et choisissez
            </h2>
            <p className="text-ink-2 mb-5">
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
                        ? "border-brand bg-brand-soft"
                        : "border-line bg-white hover:border-brand"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-brand">
                        Essai {i + 1}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-brand" : "text-muted"
                        }`}
                      >
                        {isSelected ? <><Icon name="check" size={16} strokeWidth={3} /> Choisi</> : "Choisir cet essai"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-2 mb-3 italic whitespace-pre-line">
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
                  className="btn btn-secondary px-5 py-3 "
                >
                  ← Refaire un essai
                </button>
              )}
              <button
                onClick={handleEvaluate}
                disabled={selected === null}
                className="btn btn-primary px-6 py-3 text-lg disabled:opacity-50 ml-auto"
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
              <div className="border p-4 mb-6 border-line">
                <h3 className="font-bold text-ink mb-2">Votre version retenue</h3>
                <p className="text-xs text-ink-2 mb-3 italic whitespace-pre-line">
                  Prompt : {attempts[selected].prompt}
                </p>
                <Markdown content={attempts[selected].output} />
              </div>
            )}

            {evaluating && !verdict ? (
              <p className="text-center text-ink-2">Évaluation en cours…</p>
            ) : verdict ? (
              <Verdict verdict={verdict} />
            ) : (
              <p className="text-danger">Évaluation indisponible.</p>
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
