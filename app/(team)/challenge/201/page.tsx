"use client";

import { useMemo, useState, useCallback } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Spinner from "@/components/shared/Spinner";
import SubmitButton from "@/components/shared/SubmitButton";
import Verdict from "@/components/challenges/general/Verdict";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  GEN_A_CONSIGNES,
  GEN_A_HELPERS,
  GEN_A_SVG_PROMPT,
  GEN_A_INTERPRET_PROMPT,
  GEN_A_EVAL_PROMPT,
  type GeneralVerdict,
} from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
} from "@/lib/challenges/general-helpers";
import { sanitizeSvg, parseJsonObject } from "@/lib/challenges/general-pure";

const CHALLENGE_ID = 201;

type Phase = "compose" | "result";

export default function GenAPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const consigne = useMemo(
    () => GEN_A_CONSIGNES[Math.floor(Math.random() * GEN_A_CONSIGNES.length)],
    []
  );

  const [phase, setPhase] = useState<Phase>("compose");
  const [prompt, setPrompt] = useState("");
  const [legend, setLegend] = useState("");
  const [svg, setSvg] = useState("");
  const [generating, setGenerating] = useState(false);
  const [interpretation, setInterpretation] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const addHelper = (h: string) =>
    setPrompt((p) => (p.trim() ? `${p.trim()}, ${h}` : h));

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating || !prompt.trim()) return;
    setGenerating(true);
    setSvg("");
    let raw = "";
    await streamFromProxy({
      systemPrompt: GEN_A_SVG_PROMPT,
      messages: [{ role: "user", content: prompt }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 2000,
      onChunk: (t) => {
        raw += t;
      },
      onDone: () => {
        setSvg(sanitizeSvg(raw));
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, prompt]);

  const handleBlindTest = useCallback(async () => {
    if (!teamId || evaluating || !svg) return;
    setEvaluating(true);

    let interp = "";
    await streamFromProxy({
      systemPrompt: GEN_A_INTERPRET_PROMPT,
      messages: [{ role: "user", content: svg }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 200,
      onChunk: (t) => {
        interp += t;
      },
      onDone: () => setInterpretation(interp.trim()),
      onError: () => {},
    });

    const evalPrompt = GEN_A_EVAL_PROMPT.replace("{CONSIGNE}", consigne)
      .replace("{INTERPRETATION}", interp.trim())
      .replace("{PROMPT}", prompt)
      .replace("{LEGENDE}", legend || "(aucune)");
    let txt = "";
    await streamFromProxy({
      systemPrompt: evalPrompt,
      messages: [{ role: "user", content: "Évalue maintenant." }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 700,
      onChunk: (t) => {
        txt += t;
      },
      onDone: () => {
        setVerdict(parseJsonObject<GeneralVerdict>(txt));
        setEvaluating(false);
        setPhase("result");
      },
      onError: () => setEvaluating(false),
    });
  }, [teamId, evaluating, svg, consigne, prompt, legend]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      consigne,
      prompt,
      legend,
      svg,
      interpretation,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, consigne, prompt, legend, svg, interpretation, verdict]);

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
              Défi A — Le pictogramme express
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Faites comprendre une consigne sans aucun texte.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={780} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <section className="border-2 border-black p-5 mb-6 bg-[#F5F5F5]">
          <p className="text-sm text-[#4A4A4A] uppercase tracking-wide font-semibold">
            Votre consigne tirée au sort
          </p>
          <p className="text-2xl font-bold text-black mt-1">« {consigne} »</p>
        </section>

        {phase === "compose" && (
          <>
            <section className="mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">Votre prompt</h2>
              <p className="text-[#4A4A4A] mb-3">
                Décrivez à l&apos;IA le pictogramme à produire. Aides :
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {GEN_A_HELPERS.map((h) => (
                  <button
                    key={h}
                    onClick={() => addHelper(h)}
                    disabled={!!svg}
                    className="px-3 py-1 border-2 border-[#2D5A3D] text-[#2D5A3D] text-sm font-semibold disabled:opacity-50"
                  >
                    + {h}
                  </button>
                ))}
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!!svg}
                rows={4}
                placeholder="Crée un pictogramme simple et universel pour…"
                className="w-full border-2 border-black p-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-60"
              />
              <label className="block mt-3 font-semibold text-black">
                Légende (5 mots maximum)
                <input
                  type="text"
                  value={legend}
                  onChange={(e) => setLegend(e.target.value)}
                  disabled={!!svg}
                  className="w-full border-2 border-black px-3 py-2 mt-1 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-60"
                />
              </label>
              {!svg && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
                  >
                    {generating ? "Génération…" : "Générer le pictogramme"}
                  </button>
                </div>
              )}
            </section>

            {generating && (
              <div className="flex flex-col items-center gap-3 py-8 text-[#4A4A4A]">
                <Spinner size="lg" />
                <p className="text-lg font-semibold">L&apos;IA dessine…</p>
              </div>
            )}

            {svg && !generating && (
              <section className="mb-6">
                <h2 className="text-2xl font-bold text-black mb-3">Votre pictogramme</h2>
                <div
                  className="border-2 border-black bg-white w-64 h-64 mx-auto flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                {legend && (
                  <p className="text-center font-semibold text-black mt-2">{legend}</p>
                )}
                <div className="flex justify-center mt-5">
                  <button
                    onClick={handleBlindTest}
                    disabled={evaluating}
                    className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
                  >
                    {evaluating ? "Test en cours…" : "Lancer le test à l'aveugle"}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {phase === "result" && (
          <section className="mb-8">
            <div className="border-2 border-black bg-white w-48 h-48 mx-auto flex items-center justify-center [&_svg]:w-full [&_svg]:h-full mb-4">
              <span dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <div className="border-2 border-black p-4 mb-6">
              <p className="text-sm text-[#4A4A4A] font-semibold">
                Lecture « à l&apos;aveugle » par l&apos;IA :
              </p>
              <p className="text-black mt-1">« {interpretation} »</p>
              <p className="text-sm text-[#4A4A4A] mt-2">
                Consigne d&apos;origine : « {consigne} »
              </p>
            </div>

            {verdict ? (
              <Verdict verdict={verdict} />
            ) : (
              <p className="text-[#8B3A3A]">Évaluation indisponible.</p>
            )}

            <div className="flex justify-center mt-6">
              <SubmitButton
                state={submitState}
                onClick={handleSubmit}
                label="Valider"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
