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
  UC1_MISSIONS,
  UC1_GENERATION_PROMPT,
  UC1_JUDGE_PROMPT,
} from "@/lib/ai/usecase-prompts";
import { UC1_FONDS } from "@/lib/ai/fonds-documentaire";
import type { GeneralVerdict } from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
} from "@/lib/challenges/general-helpers";
import { parseJsonObject } from "@/lib/challenges/general-pure";

const CHALLENGE_ID = 301;

const KIND_LABELS: Record<string, string> = {
  dossier: "Dossier",
  rapport: "Rapport interne",
  stage: "Stage",
  vie_etablissement: "Vie de l'établissement",
  externe: "Extérieur",
};

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Score de sélection /10 : proportionnel aux pièces attendues retrouvées,
 * −1 par pièce superflue, −4 si la pièce RGPD (autre personne) a été cochée.
 */
function selectionScore(selectedIds: string[], expectedIds: string[]): number {
  const expected = new Set(expectedIds);
  const hits = selectedIds.filter((id) => expected.has(id)).length;
  const rgpdPicked = selectedIds.some(
    (id) => UC1_FONDS.find((d) => d.id === id)?.rgpd
  );
  const extras = selectedIds.filter(
    (id) => !expected.has(id) && !UC1_FONDS.find((d) => d.id === id)?.rgpd
  ).length;
  const raw = (10 * hits) / expected.size - extras - (rgpdPicked ? 4 : 0);
  return Math.max(0, Math.round(raw));
}

type Phase = "select" | "result";

export default function Uc1Page() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const mission = useMemo(() => pick(UC1_MISSIONS), []);
  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [consigne, setConsigne] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selScore = useMemo(
    () => selectionScore(selectedIds, mission.expectedIds),
    [selectedIds, mission.expectedIds]
  );
  const rgpdPicked = selectedIds.some(
    (id) => UC1_FONDS.find((d) => d.id === id)?.rgpd
  );

  const runJudge = useCallback(
    async (synthese: string) => {
      if (!teamId) return;
      setEvaluating(true);
      const prompt = UC1_JUDGE_PROMPT.replace("{MISSION}", mission.brief)
        .replace("{FOCUS}", mission.judgeFocus)
        .replace("{RESULTAT}", synthese);
      let txt = "";
      await streamFromProxy({
        systemPrompt: prompt,
        messages: [{ role: "user", content: "Évalue maintenant." }],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 600,
        onChunk: (t) => {
          txt += t;
        },
        onDone: () => {
          const raw = parseJsonObject<{
            qualite: number;
            point_fort?: string;
            a_ameliorer?: string;
            conseil?: string;
          }>(txt);
          const qualite = Math.max(0, Math.min(10, raw?.qualite ?? 0));
          setVerdict({
            total: selScore + qualite,
            details: [
              { label: "Sélection des pièces", score: selScore, max: 10 },
              { label: "Qualité du livrable", score: qualite, max: 10 },
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
    [teamId, mission, selScore]
  );

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating || selectedIds.length === 0 || !consigne.trim())
      return;
    setGenerating(true);
    setOutput("");
    setPhase("result");

    const docsText = UC1_FONDS.filter((d) => selectedIds.includes(d.id))
      .map((d) => `### ${d.title}\n${d.content}`)
      .join("\n\n");

    let txt = "";
    await streamFromProxy({
      systemPrompt: `${UC1_GENERATION_PROMPT}\n\nDOCUMENTS FOURNIS PAR L'ÉQUIPE :\n\n${docsText}`,
      messages: [
        {
          role: "user",
          content: `Mission : ${mission.brief}\n\nConsigne de l'équipe : ${consigne.trim()}`,
        },
      ],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 2500,
      onChunk: (t) => {
        txt += t;
        setOutput((p) => p + t);
      },
      onDone: () => {
        setGenerating(false);
        runJudge(txt);
      },
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, selectedIds, consigne, mission, runJudge]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      mission: mission.id,
      selectedDocs: selectedIds,
      consigne,
      synthese: output,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, mission, selectedIds, consigne, output, verdict]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-black">
              Cas d&apos;usage 1 — La mission documentaire
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Choisissez les bonnes pièces. Rien de plus, rien de moins.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={1200} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        {/* La mission de l'équipe */}
        <section className="mb-8 border-2 border-[#2D5A3D] p-5 bg-[#F0F5F1]">
          <p className="text-sm font-bold text-[#2D5A3D] mb-1">
            VOTRE MISSION — {mission.label}
          </p>
          <p className="text-black leading-relaxed">{mission.brief}</p>
        </section>

        {phase === "select" && (
          <>
            {/* Fond documentaire */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-2">
                Le fond documentaire ({UC1_FONDS.length} pièces)
              </h2>
              <p className="text-[#4A4A4A] mb-4">
                L&apos;IA ne verra QUE les pièces que vous cochez. Trop de
                pièces : du bruit. Pas assez : des trous. Et certaines
                pièces… ne devraient jamais lui être confiées. Cliquez sur un
                titre pour lire la pièce.
              </p>
              <div className="flex flex-col gap-2">
                {UC1_FONDS.map((d) => (
                  <div
                    key={d.id}
                    className={`border-2 ${
                      selected[d.id] ? "border-[#2D5A3D] bg-[#F0F5F1]" : "border-black"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        id={`doc-${d.id}`}
                        checked={!!selected[d.id]}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [d.id]: e.target.checked }))
                        }
                        className="w-5 h-5 accent-[#2D5A3D] shrink-0"
                      />
                      <button
                        type="button"
                        onClick={() => setOpenDoc(openDoc === d.id ? null : d.id)}
                        className="flex-1 text-left font-semibold text-black hover:text-[#2D5A3D]"
                      >
                        {d.title}
                      </button>
                      <span className="shrink-0 text-xs px-2 py-0.5 border border-[#B8B8B8] text-[#4A4A4A]">
                        {KIND_LABELS[d.kind]}
                      </span>
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

            {/* Consigne */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-2">
                Votre consigne à l&apos;IA
              </h2>
              <textarea
                value={consigne}
                onChange={(e) => setConsigne(e.target.value)}
                rows={3}
                placeholder="Ex : Rédige la note demandée, en 3 parties (progrès, difficultés, suites), ton factuel, sans rien inventer…"
                className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                <span className="text-sm text-[#4A4A4A]">
                  {selectedIds.length} pièce{selectedIds.length > 1 ? "s" : ""} sélectionnée
                  {selectedIds.length > 1 ? "s" : ""}
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={selectedIds.length === 0 || !consigne.trim()}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
                >
                  Lancer la mission
                </button>
              </div>
            </section>
          </>
        )}

        {phase === "result" && (
          <>
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">
                Le livrable produit
              </h2>
              <StreamedOutput content={output} loading={generating} />
            </section>

            {/* Révélation de la sélection */}
            {!generating && output && (
              <section className="mb-8 border-2 border-[#2D5A3D] p-5">
                <h2 className="text-2xl font-bold text-black mb-2">
                  La révélation : votre sélection
                </h2>
                {rgpdPicked && (
                  <p className="border-2 border-[#8B3A3A] bg-white text-[#8B3A3A] font-semibold p-3 mb-3">
                    ⚠️ Vous avez transmis à l&apos;IA un document concernant une
                    AUTRE personne accompagnée. Données de santé d&apos;un tiers :
                    c&apos;est la ligne rouge, quel que soit l&apos;outil.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {UC1_FONDS.map((d) => {
                    const wasPicked = selectedIds.includes(d.id);
                    const wasExpected = mission.expectedIds.includes(d.id);
                    if (!wasPicked && !wasExpected) return null;
                    const ok = wasPicked === wasExpected && !d.rgpd;
                    return (
                      <div
                        key={d.id}
                        className={`border-l-4 pl-3 py-1 ${
                          ok ? "border-[#2D5A3D]" : "border-[#8B3A3A]"
                        }`}
                      >
                        <p className="font-semibold text-black text-sm">
                          {ok ? "✓" : "✗"} {d.title}
                          <span className="font-normal text-[#4A4A4A]">
                            {" "}
                            —{" "}
                            {wasPicked && !wasExpected
                              ? d.rgpd
                                ? "à ne jamais transmettre"
                                : "superflue pour cette mission"
                              : !wasPicked && wasExpected
                                ? "elle manquait à l'IA"
                                : "bien vu"}
                          </span>
                        </p>
                        <p className="text-xs text-[#4A4A4A]">{d.debrief}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Verdict */}
            {!generating && output && (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
