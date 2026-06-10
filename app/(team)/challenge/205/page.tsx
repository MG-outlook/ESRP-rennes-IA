"use client";

import { useMemo, useState, useCallback } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import Verdict from "@/components/challenges/general/Verdict";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  GEN_E_SITUATIONS,
  GEN_E_CONTRAINTES,
  GEN_E_GENERATE_PROMPT,
  GEN_E_EVAL_PROMPT,
  type GeneralVerdict,
} from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
  parseJsonObject,
} from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 205;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

type Phase = "ideate" | "result";

export default function GenEPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const situation = useMemo(() => pick(GEN_E_SITUATIONS), []);
  const contrainte = useMemo(() => pick(GEN_E_CONTRAINTES), []);

  const [phase, setPhase] = useState<Phase>("ideate");
  const [ideas, setIdeas] = useState("");
  const [generating, setGenerating] = useState(false);
  const [chosen, setChosen] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating) return;
    setGenerating(true);
    setIdeas("");
    const prompt = GEN_E_GENERATE_PROMPT.replace("{SITUATION}", situation).replace(
      "{CONTRAINTE}",
      contrainte
    );
    await streamFromProxy({
      systemPrompt: prompt,
      messages: [{ role: "user", content: "Propose les idées maintenant." }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 2000,
      onChunk: (t) => setIdeas((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, situation, contrainte]);

  const handleEvaluate = useCallback(async () => {
    if (!teamId || evaluating || !chosen.trim()) return;
    setEvaluating(true);
    setPhase("result");
    const prompt = GEN_E_EVAL_PROMPT.replace("{SITUATION}", situation)
      .replace("{CONTRAINTE}", contrainte)
      .replace("{IDEE}", chosen);
    let txt = "";
    await streamFromProxy({
      systemPrompt: prompt,
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
  }, [teamId, evaluating, chosen, situation, contrainte]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      situation,
      contrainte,
      ideas,
      chosen,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, situation, contrainte, ideas, chosen, verdict]);

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
              Défi E — La fabrique à idées
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Deux cartes tirées au sort. À vous de faire jaillir l&apos;idée.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={780} startedAt={startedAt} />
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="border-2 border-black p-4">
            <p className="text-xs uppercase tracking-wide text-[#4A4A4A] font-semibold">
              Situation
            </p>
            <p className="text-xl font-bold text-black mt-1">« {situation} »</p>
          </div>
          <div className="border-2 border-[#2D5A3D] p-4">
            <p className="text-xs uppercase tracking-wide text-[#4A4A4A] font-semibold">
              Contrainte forte
            </p>
            <p className="text-xl font-bold text-[#2D5A3D] mt-1">« {contrainte} »</p>
          </div>
        </section>

        {!ideas && !generating && (
          <div className="flex justify-center mb-6">
            <button
              onClick={handleGenerate}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
            >
              Générer 10 idées
            </button>
          </div>
        )}

        {(ideas || generating) && (
          <section className="mb-6">
            <h2 className="text-2xl font-bold text-black mb-3">Les idées de l&apos;IA</h2>
            <StreamedOutput content={ideas} loading={generating} />
          </section>
        )}

        {ideas && !generating && phase === "ideate" && (
          <section className="mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">
              Votre idée retenue
            </h2>
            <p className="text-[#4A4A4A] mb-3">
              Choisissez UNE idée et défendez-la en 3 lignes : à quoi elle sert,
              pour qui, pourquoi elle est réaliste demain.
            </p>
            <textarea
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              rows={5}
              placeholder="Notre idée : …"
              className="w-full border-2 border-black p-3 text-black focus:border-[#2D5A3D] focus:outline-none"
            />
            <div className="flex justify-center mt-4">
              <button
                onClick={handleEvaluate}
                disabled={!chosen.trim()}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
              >
                Défendre notre idée
              </button>
            </div>
          </section>
        )}

        {phase === "result" && (
          <section className="mb-8">
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
