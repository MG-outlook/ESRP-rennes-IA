"use client";

import { useState, useCallback, useMemo } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import Verdict from "@/components/challenges/general/Verdict";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  UC4_GENERATION_PROMPT,
  UC4_JUDGE_PROMPT,
  UC4_MAX_ATTEMPTS,
} from "@/lib/ai/usecase-prompts";
import { UC4_DOCS, UC4_KEY_POINTS } from "@/lib/ai/fonds-documentaire";
import type { GeneralVerdict } from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
} from "@/lib/challenges/general-helpers";
import { parseJsonObject } from "@/lib/challenges/general-pure";

const CHALLENGE_ID = 304;

const RELEVANT_COUNT = UC4_DOCS.filter((d) => d.relevant).length;

/** Score de sélection /8 : proportionnel aux CR utiles retrouvés, −1 par pièce parasite. */
function selectionScore(selectedIds: string[]): number {
  const hits = selectedIds.filter(
    (id) => UC4_DOCS.find((d) => d.id === id)?.relevant
  ).length;
  const extras = selectedIds.length - hits;
  return Math.max(0, Math.round((8 * hits) / RELEVANT_COUNT - extras));
}

type Phase = "compose" | "result";

export default function Uc4Page() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("compose");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selScore = useMemo(() => selectionScore(selectedIds), [selectedIds]);

  const handleGenerate = useCallback(async () => {
    if (
      !teamId ||
      generating ||
      selectedIds.length === 0 ||
      !prompt.trim() ||
      attempts >= UC4_MAX_ATTEMPTS
    )
      return;
    setGenerating(true);
    setOutput("");
    setAttempts((a) => a + 1);

    const docsText = UC4_DOCS.filter((d) => selectedIds.includes(d.id))
      .map((d) => `### ${d.title}\n${d.content}`)
      .join("\n\n");

    await streamFromProxy({
      systemPrompt: `${UC4_GENERATION_PROMPT}\n\nDOCUMENTS FOURNIS PAR L'ÉQUIPE :\n\n${docsText}`,
      messages: [{ role: "user", content: prompt.trim() }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 2500,
      onChunk: (t) => setOutput((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, selectedIds, prompt, attempts]);

  const handleEvaluate = useCallback(async () => {
    if (!teamId || evaluating || !output) return;
    setEvaluating(true);
    setPhase("result");
    const judgePrompt = UC4_JUDGE_PROMPT.replace(
      "{POINTS_CLES}",
      UC4_KEY_POINTS.map((p, i) => `${i + 1}. ${p}`).join("\n")
    )
      .replace("{PROMPT}", prompt)
      .replace("{NOTE}", output);
    let txt = "";
    await streamFromProxy({
      systemPrompt: judgePrompt,
      messages: [{ role: "user", content: "Évalue maintenant." }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 600,
      onChunk: (t) => {
        txt += t;
      },
      onDone: () => {
        const raw = parseJsonObject<{
          couverture: number;
          qualite_prompt: number;
          point_fort?: string;
          a_ameliorer?: string;
          conseil?: string;
        }>(txt);
        const couv = Math.max(0, Math.min(8, raw?.couverture ?? 0));
        const qp = Math.max(0, Math.min(4, raw?.qualite_prompt ?? 0));
        setVerdict({
          total: selScore + couv + qp,
          details: [
            { label: "Choix des pièces", score: selScore, max: 8 },
            { label: "Couverture des points clés", score: couv, max: 8 },
            { label: "Qualité du prompt", score: qp, max: 4 },
          ],
          point_fort: raw?.point_fort,
          a_ameliorer: raw?.a_ameliorer,
          conseil: raw?.conseil,
        });
        setEvaluating(false);
      },
      onError: () => setEvaluating(false),
    });
  }, [teamId, evaluating, output, prompt, selScore]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      selectedDocs: selectedIds,
      prompt,
      note: output,
      attempts,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, selectedIds, prompt, output, attempts, verdict]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  const attemptsLeft = UC4_MAX_ATTEMPTS - attempts;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-black">
              Cas d&apos;usage 4 — La synthèse d&apos;accueil du copil
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              3 réunions d&apos;avance à rattraper. Un prompt pour tout transmettre.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={1200} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <section className="mb-8 border-2 border-[#2D5A3D] p-5 bg-[#F0F5F1]">
          <p className="text-sm font-bold text-[#2D5A3D] mb-1">LA SITUATION</p>
          <p className="text-black leading-relaxed">
            Un nouveau membre rejoint le copil « IA à l&apos;ESRP » au copil n°4
            (17 septembre). Il doit arriver à niveau : décisions prises, actions
            en cours, points en suspens. Choisissez les bonnes pièces dans le
            fond documentaire, puis rédigez le prompt qui produira sa note
            d&apos;accueil. Attention : tout ce qui ressemble à un compte-rendu
            n&apos;en est pas un.
          </p>
        </section>

        {/* Fond documentaire */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-2">
            Le fond documentaire ({UC4_DOCS.length} pièces)
          </h2>
          <p className="text-[#4A4A4A] mb-4">
            Cliquez sur un titre pour lire la pièce. L&apos;IA ne verra que ce
            que vous cochez.
          </p>
          <div className="flex flex-col gap-2">
            {UC4_DOCS.map((d) => (
              <div
                key={d.id}
                className={`border-2 ${
                  selected[d.id] ? "border-[#2D5A3D] bg-[#F0F5F1]" : "border-black"
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={!!selected[d.id]}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [d.id]: e.target.checked }))
                    }
                    disabled={phase === "result"}
                    className="w-5 h-5 accent-[#2D5A3D] shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => setOpenDoc(openDoc === d.id ? null : d.id)}
                    className="flex-1 text-left font-semibold text-black hover:text-[#2D5A3D]"
                  >
                    {d.title}
                  </button>
                </div>
                {openDoc === d.id && (
                  <p className="px-4 pb-4 text-sm text-[#4A4A4A] whitespace-pre-line border-t border-[#E0E0E0] pt-3">
                    {d.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {phase === "compose" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Votre prompt — c&apos;est lui qui fait tout
            </h2>
            <p className="text-[#4A4A4A] mb-3">
              Pensez : pour qui ? quel format ? que doit couvrir la note
              (décisions, actions, points en suspens) ? qu&apos;est-il interdit
              d&apos;inventer ? Vous avez {UC4_MAX_ATTEMPTS} essais.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={generating}
              placeholder="Rédige une note d'accueil pour le nouveau membre du copil…"
              className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
              <span className="text-sm text-[#4A4A4A]">
                {attemptsLeft > 0
                  ? `Essais restants : ${attemptsLeft}/${UC4_MAX_ATTEMPTS}`
                  : "Plus d'essai disponible — faites évaluer votre note."}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={
                    generating ||
                    selectedIds.length === 0 ||
                    !prompt.trim() ||
                    attempts >= UC4_MAX_ATTEMPTS
                  }
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50"
                >
                  {generating
                    ? "Génération…"
                    : `Générer la note (essai ${Math.min(attempts + 1, UC4_MAX_ATTEMPTS)}/${UC4_MAX_ATTEMPTS})`}
                </button>
                {output && !generating && (
                  <button
                    onClick={handleEvaluate}
                    className="px-6 py-3 bg-white text-[#2D5A3D] font-semibold border-2 border-[#2D5A3D] text-lg"
                  >
                    Faire évaluer cette note →
                  </button>
                )}
              </div>
            </div>

            {(output || generating) && (
              <div className="mt-6">
                <h3 className="font-bold text-black mb-2">La note d&apos;accueil produite</h3>
                <StreamedOutput content={output} loading={generating} />
              </div>
            )}
          </section>
        )}

        {phase === "result" && (
          <>
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-2">
                La note d&apos;accueil retenue
              </h2>
              <StreamedOutput content={output} loading={false} />
            </section>

            {/* Révélation des pièces */}
            <section className="mb-8 border-2 border-[#2D5A3D] p-5">
              <h2 className="text-2xl font-bold text-black mb-3">
                La révélation : les pièces
              </h2>
              <div className="flex flex-col gap-2">
                {UC4_DOCS.map((d) => {
                  const picked = selectedIds.includes(d.id);
                  if (!picked && !d.relevant) return null;
                  const ok = picked === d.relevant;
                  return (
                    <div
                      key={d.id}
                      className={`border-l-4 pl-3 py-1 ${
                        ok ? "border-[#2D5A3D]" : "border-[#8B3A3A]"
                      }`}
                    >
                      <p className="font-semibold text-black text-sm">
                        {ok ? "✓" : "✗"} {d.title}
                      </p>
                      <p className="text-xs text-[#4A4A4A]">{d.debrief}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mb-8">
              {evaluating && !verdict ? (
                <p className="text-center text-[#4A4A4A]">Évaluation en cours…</p>
              ) : verdict ? (
                <Verdict verdict={verdict} />
              ) : null}
              {verdict && (
                <div className="flex justify-center mt-6">
                  <SubmitButton
                    state={submitState}
                    onClick={handleSubmit}
                    label="Valider"
                  />
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
