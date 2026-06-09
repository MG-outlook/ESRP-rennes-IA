"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import PredictionWidget from "@/components/shared/PredictionWidget";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import TurnByTurnPanel from "@/components/challenges/shared/TurnByTurnPanel";
import { getRoleHints, type Composition, type Role } from "@/lib/roles/adapter";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  DEFI2_SYNTHESE_PRO_PROMPT,
  DEFI2_SYNTHESE_FALC_PROMPT,
  DEFI2_FALC_EVAL_PROMPT,
} from "@/lib/ai/prompts";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

const CHALLENGE_ID = 2;

type Phase = "contributions" | "prediction" | "generation" | "results";

interface FalcEval {
  scores: number[];
  total: number;
  commentaire: string;
}

export default function Defi2Page() {
  const [phase, setPhase] = useState<Phase>("contributions");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [contributions, setContributions] = useState<Record<Role, string> | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [predictionValue, setPredictionValue] = useState(5);
  const [proOutput, setProOutput] = useState("");
  const [falcOutput, setFalcOutput] = useState("");
  const [proGenerating, setProGenerating] = useState(false);
  const [falcGenerating, setFalcGenerating] = useState(false);
  const [falcEval, setFalcEval] = useState<FalcEval | null>(null);
  const [adjustCount, setAdjustCount] = useState(0);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const { show: showToast } = useToast();

  // Auto-save contributions
  useAutoSave(`c2-contributions:${teamId ?? ""}`, contributions);

  const { restored: restoredContribs, clear: clearSavedContribs } =
    useAutoSaveRestore<Record<string, string>>(`c2-contributions:${teamId ?? ""}`);

  useEffect(() => {
    if (restoredContribs && !contributions) {
      setContributions(restoredContribs as Record<Role, string>);
      showToast("Brouillon restaure", "info");
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

      const { data: team } = await supabase
        .from("teams")
        .select("composition")
        .eq("id", session.team_id)
        .single();
      if (team?.composition) setComposition(team.composition as Composition);

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

  const roleHints = composition
    ? getRoleHints(composition, "defi2_synthese")
    : null;

  function buildUserMessage(contribs: Record<Role, string>): string {
    const labels: Record<Role, string> = {
      admin: "Gestionnaire administratif",
      medico_psy: "Professionnel médico-psy-social",
      formateur: "Formateur",
      insertion_pro: "Chargé d'insertion pro",
    };
    const parts = (Object.keys(contribs) as Role[])
      .filter((r) => contribs[r].trim())
      .map((r) => `[${labels[r]}]\n${contribs[r]}`);
    return `Contributions de l'équipe pluridisciplinaire sur le parcours de Camille Renaud :\n\n${parts.join("\n\n")}`;
  }

  const handleGenerate = useCallback(
    async (contribs: Record<Role, string>) => {
      if (!teamId) return;
      const userMsg = buildUserMessage(contribs);

      setProOutput("");
      setFalcOutput("");
      setProGenerating(true);
      setFalcGenerating(true);
      setFalcEval(null);

      // Generate both in parallel
      const proPromise = streamFromProxy({
        systemPrompt: DEFI2_SYNTHESE_PRO_PROMPT,
        messages: [{ role: "user", content: userMsg }],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 1500,
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
        maxTokens: 1000,
        onChunk: (t) => {
          fullFalc += t;
          setFalcOutput((p) => p + t);
        },
        onDone: () => setFalcGenerating(false),
        onError: () => setFalcGenerating(false),
      });

      await Promise.allSettled([proPromise, falcPromise]);

      // Evaluate FALC
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
              const parsed = JSON.parse(evalText.trim()) as FalcEval;
              setFalcEval(parsed);
            } catch {
              /* eval parse failed */
            }
          },
        });
      }

      setPhase("results");
    },
    [teamId]
  );

  const handleContributions = useCallback(
    (contribs: Record<Role, string>) => {
      setContributions(contribs);
      setPhase("prediction");
    },
    []
  );

  const handleLockPrediction = useCallback(
    async (value: unknown) => {
      if (!teamId || !contributions) return;
      setPredictionValue(value as number);
      setPredictionLocked(true);
      showToast("Prediction verrouillee", "success");

      const supabase = createClient();
      await supabase.from("predictions").insert({
        team_id: teamId,
        challenge_id: CHALLENGE_ID,
        predicted: { falc_score: value },
      });

      handleGenerate(contributions);
    },
    [teamId, contributions, handleGenerate]
  );

  const handleAdjust = useCallback(() => {
    if (adjustCount >= 1 || !contributions) return;
    setAdjustCount(1);
    setPhase("contributions");
  }, [adjustCount, contributions]);

  const handleRegenerate = useCallback(
    (contribs: Record<Role, string>) => {
      setContributions(contribs);
      handleGenerate(contribs);
    },
    [handleGenerate]
  );

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: {
        contributions,
        pro_output: proOutput,
        falc_output: falcOutput,
        falc_eval: falcEval,
        prediction: predictionValue,
      },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    // Update prediction with actual
    if (falcEval) {
      await supabase
        .from("predictions")
        .update({ actual: { falc_score: falcEval.total }, accuracy: Math.abs(predictionValue - falcEval.total) })
        .eq("team_id", teamId)
        .eq("challenge_id", CHALLENGE_ID);
    }

    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
    showToast("Reponse enregistree", "success");
    clearSavedContribs();
  }, [teamId, submitState, contributions, proOutput, falcOutput, falcEval, predictionValue, showToast, clearSavedContribs]);

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
            <h1 className="text-4xl font-bold text-black">Défi 2 — La Synthèse à 4 voix</h1>
            <p className="text-[#4A4A4A] mt-2">
              Chaque métier contribue, l&apos;IA synthétise en version pro et FALC
            </p>
          </div>
          <Timer durationSec={1500} startedAt={startedAt} />
        </div>

        <FadeTransition phaseKey={phase}>
        {/* Tour de table */}
        {(phase === "contributions") && composition && roleHints && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Tour de table</h2>
            <p className="text-[#4A4A4A] mb-4">
              Chaque métier représenté dans l&apos;équipe doit contribuer avant de générer.
              {adjustCount > 0 && " (Ajustement — modifiez une contribution)"}
            </p>
            <TurnByTurnPanel
              composition={composition}
              roleHints={roleHints}
              onAllContributed={adjustCount > 0 ? handleRegenerate : handleContributions}
            />
          </section>
        )}

        {/* Prediction */}
        {phase === "prediction" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Votre pari : quel score FALC l&apos;IA obtiendra-t-elle ?
            </h2>
            <p className="text-[#4A4A4A] mb-4">
              Le score FALC est sur 10 (5 critères × 2 points).
            </p>
            <PredictionWidget
              schema={{ field: "falc_score", min: 0, max: 10 }}
              onSubmit={handleLockPrediction}
              locked={predictionLocked}
            />
          </section>
        )}

        {/* Outputs */}
        {(phase === "generation" || phase === "results") && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-bold text-black mb-4">Synthèse professionnelle</h2>
                <StreamedOutput content={proOutput} loading={proGenerating} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black mb-4">Version FALC</h2>
                <StreamedOutput content={falcOutput} loading={falcGenerating} />
              </div>
            </div>
          </section>
        )}

        {/* FALC Evaluation */}
        {falcEval && phase === "results" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Évaluation FALC</h2>
            <div className="border-2 border-black p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl font-bold text-[#2D5A3D]">{falcEval.total}/10</span>
                <span className="text-[#4A4A4A]">
                  (votre pari : {predictionValue}/10)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4">
                {FALC_CRITERIA.map((c, i) => (
                  <div key={c} className="border-2 border-[#B8B8B8] p-3 text-center">
                    <div className="text-sm text-[#4A4A4A]">{c}</div>
                    <div className="text-2xl font-bold text-black">{falcEval.scores[i]}/2</div>
                  </div>
                ))}
              </div>
              <p className="text-[#4A4A4A]">{falcEval.commentaire}</p>
            </div>
          </section>
        )}

        {/* Adjust + Submit */}
        {phase === "results" && (
          <div className="flex items-center justify-center gap-4">
            {adjustCount < 1 && (
              <button
                onClick={handleAdjust}
                className="px-6 py-3 bg-white text-black font-semibold border-2 border-black"
              >
                Ajuster une contribution
              </button>
            )}
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
