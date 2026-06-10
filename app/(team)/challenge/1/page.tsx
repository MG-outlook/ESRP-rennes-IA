"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import DocumentCamille, { getDocumentContent } from "@/components/challenges/DocumentCamille";
import { getRoleHints, type Composition, type Role } from "@/lib/roles/adapter";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  DEFI1_SYSTEM_PROMPT,
  DEFI1_GROUND_TRUTH,
  DEFI1_TRUTH_COUNTS,
} from "@/lib/ai/prompts";
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

type Phase = "intro" | "documents" | "prediction" | "generation" | "results";

export default function Defi1Page() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<Role, number>>({
    admin: 3,
    medico_psy: 3,
    formateur: 3,
    insertion_pro: 3,
  });
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const { show: showToast } = useToast();

  useAutoSave(`c1-predictions:${teamId ?? ""}`, predictionLocked ? null : predictions);
  const { restored: restoredPreds } =
    useAutoSaveRestore<Record<string, number>>(`c1-predictions:${teamId ?? ""}`);

  useEffect(() => {
    if (restoredPreds && !predictionLocked) {
      setPredictions((prev) => ({ ...prev, ...(restoredPreds as Record<Role, number>) }));
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
    ? getRoleHints(composition, "defi1_pre_admission")
    : null;

  // Roles actually represented in the team (fall back to all four if unknown).
  const activeRoles: Role[] = composition
    ? ROLES.filter((r) => (composition[r] ?? 0) > 0)
    : ROLES;
  const betRoles = activeRoles.length > 0 ? activeRoles : ROLES;

  const handleLockPrediction = useCallback(async () => {
    if (!teamId) return;
    setPredictionLocked(true);
    showToast("Paris verrouillés", "success");
    const supabase = createClient();
    await supabase.from("predictions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      predicted: predictions,
    });
    setPhase("generation");
  }, [teamId, predictions, showToast]);

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
        maxTokens: 4000,
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
      payload: { ai_output: aiOutput, predictions, truth: DEFI1_TRUTH_COUNTS },
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
  }, [teamId, submitState, aiOutput, predictions, showToast]);

  useEffect(() => {
    if (phase === "generation" && !generating && !aiOutput) handleGenerate();
  }, [phase, generating, aiOutput, handleGenerate]);

  // Total gap between bets and truth, over represented roles.
  const totalGap = betRoles.reduce(
    (sum, r) => sum + Math.abs((predictions[r] ?? 0) - DEFI1_TRUTH_COUNTS[r]),
    0
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">Défi 1 — La Pré-admission</h1>
            <p className="text-[#4A4A4A] mt-2">
              Le dossier de Camille vient d&apos;arriver. Que voit chaque métier dans le même dossier ?
            </p>
          </div>
          <Timer durationSec={1200} startedAt={startedAt} />
        </div>

        <FadeTransition phaseKey={phase}>

        {/* INTRO — explain the game */}
        {phase === "intro" && (
          <section className="border-2 border-black p-8 mb-8 bg-[#F5F5F5]">
            <h2 className="text-2xl font-bold text-black mb-4">Comment ça marche</h2>
            <ol className="list-decimal pl-6 space-y-3 text-black text-lg">
              <li>
                <strong>Lisez le dossier de Camille</strong> — trois documents :
                un courrier MDPH, une lettre de motivation et une fiche médicale.
              </li>
              <li>
                <strong>Pariez avant l&apos;IA.</strong> Pour chaque métier de votre
                équipe, estimez : <em>combien d&apos;informations utiles à mon métier
                se cachent dans ce dossier&nbsp;?</em> (de 0 à 10).
              </li>
              <li>
                <strong>L&apos;IA produit la fiche de synthèse</strong> pluri-pro
                en 4 sections, une par métier.
              </li>
              <li>
                <strong>La Vérité.</strong> On révèle les informations réellement
                présentes pour chaque métier, et on compare à votre pari. Plus
                votre estimation est proche, mieux c&apos;est&nbsp;!
              </li>
            </ol>
            <p className="text-[#4A4A4A] mt-5 italic">
              L&apos;idée du jeu : découvrir que chaque métier voit des choses
              différentes dans le même dossier — et ce que l&apos;on rate quand on
              le lit seul·e.
            </p>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setPhase("documents")}
                className="px-8 py-4 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl hover:bg-[#234a31] transition-colors"
              >
                C&apos;est parti
              </button>
            </div>
          </section>
        )}

        {/* DOCUMENTS */}
        {phase !== "intro" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Le dossier de Camille</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <DocumentCamille kind="mdph_letter" />
              <DocumentCamille kind="motivation_letter" />
              <DocumentCamille kind="medical_sheet" />
            </div>
          </section>
        )}

        {phase === "documents" && (
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setPhase("prediction")}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
            >
              Nous avons lu — Faire nos paris
            </button>
          </div>
        )}

        {/* PREDICTION */}
        {(phase === "prediction" || phase === "generation" || phase === "results") && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Votre pari : combien d&apos;infos utiles par métier ?
            </h2>
            <p className="text-[#4A4A4A] mb-5">
              Pour chaque métier représenté, estimez le nombre d&apos;informations
              du dossier réellement utiles à ce regard (de 0 à 10).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {betRoles.map((role) => (
                <div key={role} className="border-2 border-black p-4">
                  <h3 className="font-bold text-black mb-3">{ROLE_LABELS[role]}</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-[#4A4A4A] w-6 text-right">0</span>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={predictions[role]}
                      disabled={predictionLocked}
                      onChange={(e) =>
                        setPredictions((prev) => ({
                          ...prev,
                          [role]: Number(e.target.value),
                        }))
                      }
                      className="flex-1 accent-[#2D5A3D]"
                      aria-label={`Pari pour ${ROLE_LABELS[role]}`}
                    />
                    <span className="text-[#4A4A4A] w-6">10</span>
                    <span className="text-2xl font-bold text-[#2D5A3D] w-8 text-center">
                      {predictions[role]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {phase === "prediction" && !predictionLocked && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLockPrediction}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
                >
                  Verrouiller nos paris et lancer l&apos;IA
                </button>
              </div>
            )}
          </section>
        )}

        {/* AI OUTPUT */}
        {(phase === "generation" || phase === "results") && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">La fiche de synthèse de l&apos;IA</h2>
            <StreamedOutput content={aiOutput} loading={generating} />
          </section>
        )}

        {/* RESULTS — la Vérité */}
        {phase === "results" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">La Vérité</h2>
            <p className="text-[#4A4A4A] mb-5">
              Voici les informations réellement présentes dans le dossier, métier
              par métier. Comparez avec vos paris.
            </p>
            <div className="flex flex-col gap-4">
              {DEFI1_GROUND_TRUTH.filter((t) => betRoles.includes(t.role)).map((t) => {
                const bet = predictions[t.role] ?? 0;
                const actual = t.facts.length;
                const gap = Math.abs(bet - actual);
                return (
                  <div key={t.role} className="border-2 border-black p-5">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <h3 className="font-bold text-black text-lg">{t.label}</h3>
                      <p className="text-sm text-[#4A4A4A]">
                        Votre pari : <strong className="text-black">{bet}</strong> —
                        Réel : <strong className="text-[#2D5A3D]">{actual}</strong> —
                        Écart : <strong className={gap <= 1 ? "text-[#2D5A3D]" : "text-[#8B3A3A]"}>{gap}</strong>
                      </p>
                    </div>
                    <ul className="list-disc pl-6 space-y-1 text-black">
                      {t.facts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <div className="border-2 border-[#2D5A3D] bg-[#F5F5F5] p-5 mt-5 text-center">
              <p className="text-black text-lg">
                Écart total : <strong className="text-2xl text-[#2D5A3D]">{totalGap}</strong>
              </p>
              <p className="text-[#4A4A4A] mt-1">
                {totalGap <= 3
                  ? "Excellente lecture du dossier — votre équipe a l'œil !"
                  : totalGap <= 7
                  ? "Bonne estimation. Certaines infos passent sous le radar quand on lit vite."
                  : "Le dossier est plus riche qu'il n'y paraît : c'est tout l'intérêt du regard croisé."}
              </p>
            </div>
          </section>
        )}

        {/* SUBMIT */}
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
