"use client";

import { useState, useCallback } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Spinner from "@/components/shared/Spinner";
import SubmitButton from "@/components/shared/SubmitButton";
import Verdict from "@/components/challenges/general/Verdict";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  GEN_D_ORIGINAL,
  GEN_D_GENERATE_PROMPT,
  GEN_D_RECONSTRUCT_PROMPT,
  GEN_D_EVAL_PROMPT,
  type GeneralVerdict,
} from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
  parseJsonObject,
} from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 204;

interface Versions {
  pro: string;
  falc: string;
  partenaire: string;
}

type Phase = "produce" | "result";

export default function GenDPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("produce");
  const [versions, setVersions] = useState<Versions | null>(null);
  const [falcEdit, setFalcEdit] = useState("");
  const [generating, setGenerating] = useState(false);
  const [working, setWorking] = useState(false);
  const [reconstructed, setReconstructed] = useState("");
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating) return;
    setGenerating(true);
    let txt = "";
    await streamFromProxy({
      systemPrompt: GEN_D_GENERATE_PROMPT,
      messages: [{ role: "user", content: GEN_D_ORIGINAL }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 1500,
      onChunk: (t) => {
        txt += t;
      },
      onDone: () => {
        const v = parseJsonObject<Versions>(txt);
        if (v) {
          setVersions(v);
          setFalcEdit(v.falc ?? "");
        }
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    });
  }, [teamId, generating]);

  const handleRoundTrip = useCallback(async () => {
    if (!teamId || working || !versions || !falcEdit.trim()) return;
    setWorking(true);
    setPhase("result");

    // 1) Reconstruct the original from the FALC version only.
    let recon = "";
    await streamFromProxy({
      systemPrompt: GEN_D_RECONSTRUCT_PROMPT,
      messages: [{ role: "user", content: falcEdit }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 800,
      onChunk: (t) => {
        recon += t;
      },
      onDone: () => setReconstructed(recon.trim()),
      onError: () => {},
    });

    // 2) Evaluate fidelity + accessibility + multi-public.
    const evalPrompt = GEN_D_EVAL_PROMPT.replace("{ORIGINAL}", GEN_D_ORIGINAL)
      .replace("{RECONSTRUIT}", recon.trim())
      .replace(
        "{VERSIONS}",
        JSON.stringify({
          pro: versions.pro,
          falc: falcEdit,
          partenaire: versions.partenaire,
        })
      );
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
        setWorking(false);
      },
      onError: () => setWorking(false),
    });
  }, [teamId, working, versions, falcEdit]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      versions: versions ? { ...versions, falc: falcEdit } : null,
      reconstructed,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, versions, falcEdit, reconstructed, verdict]);

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
        </section>

        {phase === "produce" && (
          <>
            {!versions && (
              <div className="flex justify-center mb-6">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
                >
                  {generating ? "Génération…" : "Produire les 3 versions"}
                </button>
              </div>
            )}

            {generating && (
              <div className="flex flex-col items-center gap-3 py-8 text-[#4A4A4A]">
                <Spinner size="lg" />
                <p className="text-lg font-semibold">L&apos;IA adapte le message…</p>
              </div>
            )}

            {versions && (
              <section className="flex flex-col gap-4 mb-6">
                <div className="border-2 border-black p-4">
                  <h3 className="font-bold text-black mb-1">Version pro</h3>
                  <p className="text-black whitespace-pre-line text-sm">{versions.pro}</p>
                </div>
                <div className="border-2 border-[#2D5A3D] p-4">
                  <h3 className="font-bold text-[#2D5A3D] mb-1">
                    Version FALC (modifiable — c&apos;est elle qui passe le test)
                  </h3>
                  <textarea
                    value={falcEdit}
                    onChange={(e) => setFalcEdit(e.target.value)}
                    rows={6}
                    className="w-full border-2 border-black p-3 text-black focus:border-[#2D5A3D] focus:outline-none"
                  />
                </div>
                <div className="border-2 border-black p-4">
                  <h3 className="font-bold text-black mb-1">Version partenaire</h3>
                  <p className="text-black whitespace-pre-line text-sm">
                    {versions.partenaire}
                  </p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleRoundTrip}
                    disabled={working || !falcEdit.trim()}
                    className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
                  >
                    Lancer le test aller-retour
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {phase === "result" && (
          <section className="mb-8">
            <div className="border-2 border-black p-4 mb-6">
              <h3 className="font-bold text-black mb-1">
                Message reconstruit à partir du seul FALC
              </h3>
              <p className="text-black whitespace-pre-line text-sm">
                {reconstructed || "…"}
              </p>
            </div>

            {working && !verdict ? (
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
