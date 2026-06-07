"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/shared/Timer";
import PredictionWidget from "@/components/shared/PredictionWidget";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import DocumentCamille, { getDocumentContent } from "@/components/challenges/DocumentCamille";
import { getRoleHints, type Composition, type Role } from "@/lib/roles/adapter";
import { streamFromProxy } from "@/lib/ai/proxy";
import { DEFI1_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

const CHALLENGE_ID = 1;
const ROLES: Role[] = ["admin", "medico_psy", "formateur", "insertion_pro"];
const ROLE_LABELS: Record<Role, string> = {
  admin: "Administratif",
  medico_psy: "Médico-psy-social",
  formateur: "Formation",
  insertion_pro: "Insertion pro",
};

type Phase = "documents" | "prediction" | "generation" | "results";

export default function Defi1Page() {
  const [phase, setPhase] = useState<Phase>("documents");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<Role, number>>({
    admin: 50,
    medico_psy: 50,
    formateur: 50,
    insertion_pro: 50,
  });
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const { show: showToast } = useToast();

  // Auto-save predictions before lock
  useAutoSave(`c1-predictions:${teamId ?? ""}`, predictionLocked ? null : predictions);

  const { restored: restoredPreds, clear: clearSavedPreds } =
    useAutoSaveRestore<Record<string, number>>(`c1-predictions:${teamId ?? ""}`);

  useEffect(() => {
    if (restoredPreds && !predictionLocked) {
      setPredictions(restoredPreds as Record<Role, number>);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load team data + start progress
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

      if (team?.composition) {
        setComposition(team.composition as Composition);
      }

      // Upsert team_progress
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
    ? getRoleHints(composition, "defi1_pre_admission")
    : null;

  const handleLockPrediction = useCallback(async (value: unknown) => {
    if (!teamId) return;
    const predicted = value as Record<Role, number>;
    setPredictions(predicted);
    setPredictionLocked(true);
    showToast("Prediction verrouillee", "success");
    clearSavedPreds();

    const supabase = createClient();
    await supabase.from("predictions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      predicted,
    });

    setPhase("generation");
  }, [teamId]);

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating) return;
    setGenerating(true);
    setAiOutput("");

    const documents = [
      getDocumentContent("mdph_letter"),
      getDocumentContent("motivation_letter"),
      getDocumentContent("medical_sheet"),
    ].join("\n\n---\n\n");

    const roleContext = roleHints
      ? ROLES.map((r) => `[${ROLE_LABELS[r]}] ${roleHints[r].hint}`).join("\n")
      : "";

    const userMessage = `Voici les 3 documents du dossier de pré-admission de Camille Renaud :\n\n${documents}\n\n---\n\nContexte de l'équipe :\n${roleContext}\n\nProduis la fiche de synthèse en 4 sections.`;

    try {
      await streamFromProxy({
        systemPrompt: DEFI1_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 2000,
        onChunk: (text) => setAiOutput((prev) => prev + text),
        onDone: () => {
          setGenerating(false);
          setPhase("results");
        },
        onError: () => setGenerating(false),
      });
    } catch {
      setGenerating(false);
    }
  }, [teamId, generating, roleHints]);

  const handleSubmitScore = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");

    const supabase = createClient();

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { ai_output: aiOutput, predictions },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    // Mark challenge finished
    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
    showToast("Reponse enregistree", "success");
  }, [teamId, submitState, aiOutput, predictions, showToast]);

  // Auto-generate on entering generation phase
  useEffect(() => {
    if (phase === "generation" && !generating && !aiOutput) {
      handleGenerate();
    }
  }, [phase, generating, aiOutput, handleGenerate]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">Défi 1 — La Pré-admission</h1>
            <p className="text-[#4A4A4A] mt-2">
              Analysez le dossier de Camille avec vos regards croisés
            </p>
          </div>
          <Timer durationSec={1200} startedAt={startedAt} />
        </div>

        {/* Documents */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">Les documents de Camille</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DocumentCamille kind="mdph_letter" />
            <DocumentCamille kind="motivation_letter" />
            <DocumentCamille kind="medical_sheet" />
          </div>
        </section>

        {/* Role hints */}
        {roleHints && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Vos regards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ROLES.map((role) => (
                <div
                  key={role}
                  className={`border-2 p-4 ${
                    roleHints[role].mode === "present"
                      ? "border-[#2D5A3D] bg-white"
                      : "border-[#B8B8B8] bg-[#F5F5F5]"
                  }`}
                >
                  <h3 className="font-bold text-black mb-1">{ROLE_LABELS[role]}</h3>
                  <p className="text-[#4A4A4A]">{roleHints[role].hint}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prediction phase */}
        <FadeTransition phaseKey={phase}>
        {phase === "documents" && (
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setPhase("prediction")}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
            >
              J&apos;ai lu les documents — Faire mon pari
            </button>
          </div>
        )}

        {(phase === "prediction" || phase === "generation" || phase === "results") && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Votre pari : quel % d&apos;infos utiles l&apos;IA va-t-elle extraire ?
            </h2>
            <p className="text-[#4A4A4A] mb-4">
              Pour chaque regard professionnel, estimez le pourcentage d&apos;informations pertinentes que l&apos;IA trouvera.
            </p>
            {composition && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROLES.filter((r) => (composition[r] ?? 0) > 0).map((role) => (
                  <div key={role} className="border-2 border-black p-4">
                    <h3 className="font-bold text-black mb-2">{ROLE_LABELS[role]}</h3>
                    <PredictionWidget
                      schema={{ field: `info_utiles_pct_${role}`, min: 0, max: 100 }}
                      onSubmit={(v) => {
                        setPredictions((prev) => ({ ...prev, [role]: v as number }));
                      }}
                      locked={predictionLocked}
                    />
                  </div>
                ))}
              </div>
            )}
            {phase === "prediction" && !predictionLocked && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => handleLockPrediction(predictions)}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D]"
                >
                  Verrouiller tous les paris
                </button>
              </div>
            )}
          </section>
        )}

        {/* AI Output */}
        {(phase === "generation" || phase === "results") && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Analyse de l&apos;IA
            </h2>
            <StreamedOutput content={aiOutput} loading={generating} />
          </section>
        )}

        {/* Submit */}
        {phase === "results" && (
          <div className="flex justify-center">
            <SubmitButton
              state={submitState}
              onClick={handleSubmitScore}
              label="Valider et passer au défi suivant"
            />
          </div>
        )}
        </FadeTransition>
      </div>
    </div>
  );
}
