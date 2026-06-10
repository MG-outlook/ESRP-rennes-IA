"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  DEFI2_SYNTHESE_PRO_PROMPT,
  DEFI2_SYNTHESE_FALC_PROMPT,
  DEFI2_FALC_EVAL_PROMPT,
  DEFI2_OBSERVATIONS,
  DEFI2_DIMENSION_LABELS,
  type Defi2Dimension,
} from "@/lib/ai/prompts";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

const CHALLENGE_ID = 2;

type Phase = "triage" | "generation" | "results";

/** Tri choisi par l'équipe pour une note : à jeter ou rangée dans une dimension. */
type Sort = "jeter" | Defi2Dimension;

const DIMENSIONS: Defi2Dimension[] = ["social", "moral", "formation", "projection"];

interface FalcEval {
  scores: number[];
  total: number;
  commentaire: string;
}

// Ordre d'affichage mélangé (déterministe) pour ne pas dévoiler le regroupement.
const SHUFFLED = [3, 13, 7, 1, 11, 5, 16, 9, 2, 14, 6, 10, 8, 12, 4, 15];

export default function Defi2Page() {
  const [phase, setPhase] = useState<Phase>("triage");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [sorts, setSorts] = useState<Record<number, Sort>>({});
  const [proOutput, setProOutput] = useState("");
  const [falcOutput, setFalcOutput] = useState("");
  const [proGenerating, setProGenerating] = useState(false);
  const [falcGenerating, setFalcGenerating] = useState(false);
  const [falcEval, setFalcEval] = useState<FalcEval | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const { show: showToast } = useToast();

  useAutoSave(`c2-sorts:${teamId ?? ""}`, phase === "triage" ? sorts : null);
  const { restored: restoredSorts, clear: clearSavedSorts } =
    useAutoSaveRestore<Record<number, Sort>>(`c2-sorts:${teamId ?? ""}`);

  useEffect(() => {
    if (restoredSorts && Object.keys(restoredSorts).length > 0) {
      setSorts(restoredSorts);
      showToast("Tri restauré", "info");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: session } = await supabase
        .from("team_sessions")
        .select("team_id")
        .eq("auth_uid", user.id)
        .single();
      if (!session) return;
      setTeamId(session.team_id);

      const { data: progress } = await supabase
        .from("team_progress")
        .select("started_at")
        .eq("team_id", session.team_id)
        .eq("challenge_id", CHALLENGE_ID)
        .single();
      if (progress?.started_at) {
        setStartedAt(progress.started_at);
      } else {
        const now = new Date().toISOString();
        await supabase.from("team_progress").upsert({
          team_id: session.team_id,
          challenge_id: CHALLENGE_ID,
          started_at: now,
        });
        setStartedAt(now);
      }
    }
    init();
  }, []);

  const orderedNotes = useMemo(
    () =>
      SHUFFLED.map((id) => DEFI2_OBSERVATIONS.find((o) => o.id === id)!).filter(
        Boolean
      ),
    []
  );

  const allSorted = orderedNotes.every((n) => sorts[n.id]);
  const keptCount = orderedNotes.filter(
    (n) => sorts[n.id] && sorts[n.id] !== "jeter"
  ).length;

  const setSort = useCallback((id: number, value: Sort) => {
    setSorts((prev) => ({ ...prev, [id]: value }));
  }, []);

  /** Construit le message envoyé à l'IA : notes gardées, groupées par dimension. */
  function buildUserMessage(): string {
    const blocks = DIMENSIONS.map((dim) => {
      const notes = DEFI2_OBSERVATIONS.filter((o) => sorts[o.id] === dim);
      if (notes.length === 0) return null;
      const lines = notes.map((n) => `- ${n.text}`).join("\n");
      return `## ${DEFI2_DIMENSION_LABELS[dim]}\n${lines}`;
    }).filter(Boolean);
    return `Observations retenues par l'équipe sur Camille Renaud (38 ans, ESRP) après 3 mois de formation, regroupées par dimension :\n\n${blocks.join(
      "\n\n"
    )}`;
  }

  const handleGenerate = useCallback(async () => {
    if (!teamId) return;
    const userMsg = buildUserMessage();

    setPhase("generation");
    setProOutput("");
    setFalcOutput("");
    setProGenerating(true);
    setFalcGenerating(true);
    setFalcEval(null);

    const proPromise = streamFromProxy({
      systemPrompt: DEFI2_SYNTHESE_PRO_PROMPT,
      messages: [{ role: "user", content: userMsg }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setProOutput((p) => p + t),
      onDone: () => setProGenerating(false),
      onError: () => setProGenerating(false),
    });

    let fullFalc = "";
    const falcPromise = streamFromProxy({
      systemPrompt: DEFI2_SYNTHESE_FALC_PROMPT,
      messages: [{ role: "user", content: userMsg }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => {
        fullFalc += t;
        setFalcOutput((p) => p + t);
      },
      onDone: () => setFalcGenerating(false),
      onError: () => setFalcGenerating(false),
    });

    await Promise.allSettled([proPromise, falcPromise]);

    if (fullFalc) {
      let evalText = "";
      await streamFromProxy({
        systemPrompt: DEFI2_FALC_EVAL_PROMPT,
        messages: [{ role: "user", content: fullFalc }],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 500,
        onChunk: (t) => { evalText += t; },
        onDone: () => {
          try {
            // The model may wrap the JSON in prose or code fences — extract the
            // first {...} block before parsing.
            const match = evalText.match(/\{[\s\S]*\}/);
            if (match) setFalcEval(JSON.parse(match[0]) as FalcEval);
          } catch {
            /* eval parse failed — non bloquant */
          }
        },
      });
    }

    setPhase("results");
  }, [teamId, sorts]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    // Score (/20): correctly kept useful notes + correctly discarded
    // off-topic/contradictory ones, over the notes that have a "right" action.
    const relevant = DEFI2_OBSERVATIONS.filter((o) => o.kind !== "redundant").length;
    let correct = 0;
    for (const o of DEFI2_OBSERVATIONS) {
      const c = sorts[o.id];
      if (o.kind === "useful") {
        if (c && c !== "jeter") correct++;
      } else if (o.kind === "offtopic" || o.kind === "contradictory") {
        if (c === "jeter") correct++;
      }
    }
    const points = relevant > 0 ? Math.round((20 * correct) / relevant) : 0;
    const supabase = createClient();
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: {
        sorts,
        pro_output: proOutput,
        falc_output: falcOutput,
        falc_eval: falcEval,
        points,
      },
      ai_provider: "proxy",
      model: "ai-proxy",
    });
    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);
    setSubmitState("done");
    showToast("Réponse enregistrée", "success");
    clearSavedSorts();
  }, [teamId, submitState, sorts, proOutput, falcOutput, falcEval, showToast, clearSavedSorts]);

  const FALC_CRITERIA = [
    "Phrases courtes",
    "Vocabulaire simple",
    "Structure claire",
    "Adressage direct",
    "Information actionnable",
  ];

  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return (
      <ChallengeIntro
        {...CHALLENGE_INTROS[CHALLENGE_ID]}
        onStart={() => setIntroDone(true)}
      />
    );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">Défi 2 — Le tri des observations</h1>
            <p className="text-[#4A4A4A] mt-2">
              Triez les notes sur Camille, l&apos;IA en fait une synthèse pro et une version FALC
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={1500} startedAt={startedAt} />
          </div>
        </div>

        <FadeTransition phaseKey={phase}>

        {/* TRIAGE */}
        {phase === "triage" && (
          <section className="mb-8">
            <div className="border-2 border-black p-5 mb-6 bg-[#F5F5F5]">
              <p className="text-black">
                Voici <strong>16 notes</strong> prises par l&apos;équipe sur Camille
                après 3 mois. Toutes ne se valent pas : certaines se répètent, se
                contredisent, ou n&apos;ont rien à faire dans un compte-rendu.
                Pour chaque note : <strong>jetez-la</strong>, ou
                <strong> rangez-la</strong> dans la bonne dimension. L&apos;IA
                n&apos;écrira qu&apos;à partir de ce que vous gardez.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {orderedNotes.map((note) => {
                const current = sorts[note.id];
                const kept = current && current !== "jeter";
                return (
                  <div
                    key={note.id}
                    className={`border-2 p-4 ${
                      current === "jeter"
                        ? "border-[#B8B8B8] bg-[#F5F5F5] opacity-60"
                        : kept
                        ? "border-[#2D5A3D] bg-white"
                        : "border-black bg-white"
                    }`}
                  >
                    <p className="text-black mb-3">« {note.text} »</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSort(note.id, "jeter")}
                        className={`px-3 py-2 border-2 text-sm font-semibold ${
                          current === "jeter"
                            ? "bg-[#8B3A3A] border-[#8B3A3A] text-white"
                            : "bg-white border-[#8B3A3A] text-[#8B3A3A]"
                        }`}
                      >
                        🗑 Jeter
                      </button>
                      <span className="w-px bg-[#E0E0E0] mx-1" aria-hidden />
                      {DIMENSIONS.map((dim) => (
                        <button
                          key={dim}
                          onClick={() => setSort(note.id, dim)}
                          className={`px-3 py-2 border-2 text-sm font-semibold ${
                            current === dim
                              ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                              : "bg-white border-black text-black"
                          }`}
                        >
                          {DEFI2_DIMENSION_LABELS[dim]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-2 mt-6">
              <button
                onClick={handleGenerate}
                disabled={!allSorted || keptCount === 0}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
              >
                Générer la synthèse
              </button>
              <p className="text-sm text-[#4A4A4A]">
                {allSorted
                  ? `${keptCount} note(s) gardée(s) sur 16`
                  : "Triez les 16 notes pour continuer"}
              </p>
            </div>
          </section>
        )}

        {/* OUTPUTS */}
        {(phase === "generation" || phase === "results") && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-bold text-black mb-4">Synthèse professionnelle</h2>
                <StreamedOutput content={proOutput} loading={proGenerating} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black mb-4">Version FALC (pour Camille)</h2>
                <StreamedOutput content={falcOutput} loading={falcGenerating} />
              </div>
            </div>
          </section>
        )}

        {/* FALC EVAL — indicateur de qualité */}
        {falcEval && phase === "results" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Qualité FALC</h2>
            <div className="border-2 border-black p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl font-bold text-[#2D5A3D]">{falcEval.total}/10</span>
                <span className="text-[#4A4A4A]">lisibilité pour Camille</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4">
                {FALC_CRITERIA.map((c, i) => (
                  <div key={c} className="border-2 border-[#B8B8B8] p-3 text-center">
                    <div className="text-sm text-[#4A4A4A]">{c}</div>
                    <div className="text-2xl font-bold text-black">{falcEval.scores?.[i] ?? "—"}/2</div>
                  </div>
                ))}
              </div>
              <p className="text-[#4A4A4A]">{falcEval.commentaire}</p>
            </div>
          </section>
        )}

        {/* DEBRIEF DU TRI */}
        {phase === "results" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">Le débrief du tri</h2>
            <p className="text-[#4A4A4A] mb-5">
              Ce que cachaient les notes : doublons, contradictions et hors-sujet.
              L&apos;IA n&apos;a écrit qu&apos;à partir de ce que vous lui avez donné.
            </p>
            <div className="flex flex-col gap-3">
              {DEFI2_OBSERVATIONS.filter((o) => o.kind !== "useful").map((o) => {
                const choice = sorts[o.id];
                const discarded = choice === "jeter";
                const good =
                  o.kind === "offtopic" || o.kind === "contradictory"
                    ? discarded
                    : true; // redondance : pas d'erreur grave si gardée
                return (
                  <div key={o.id} className="border-2 border-black p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <p className="text-black flex-1">« {o.text} »</p>
                      <span
                        className={`text-xs font-bold px-2 py-1 border-2 whitespace-nowrap ${
                          o.kind === "offtopic"
                            ? "border-[#8B3A3A] text-[#8B3A3A]"
                            : o.kind === "contradictory"
                            ? "border-[#B5651D] text-[#B5651D]"
                            : "border-[#4A4A4A] text-[#4A4A4A]"
                        }`}
                      >
                        {o.kind === "offtopic"
                          ? "Hors-sujet"
                          : o.kind === "contradictory"
                          ? "Contradiction"
                          : "Doublon"}
                      </span>
                    </div>
                    {o.debrief && (
                      <p className="text-sm text-[#4A4A4A] mt-2">{o.debrief}</p>
                    )}
                    <p className="text-sm mt-2 font-semibold">
                      {good ? (
                        <span className="text-[#2D5A3D]">✓ Bien vu par l&apos;équipe</span>
                      ) : (
                        <span className="text-[#8B3A3A]">
                          ⚠ Cette note avait été gardée — à rediscuter
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SUBMIT */}
        {phase === "results" && (
          <div className="flex justify-center">
            <SubmitButton
              state={submitState}
              onClick={handleSubmit}
              label="Valider et passer au défi suivant"
            />
          </div>
        )}
        </FadeTransition>
      </div>
    </div>
  );
}
