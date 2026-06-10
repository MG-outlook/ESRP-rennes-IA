"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_D_SUBVENTION_PROMPT } from "@/lib/ai/prompts";

const CHALLENGE_ID = 104;

export default function BonusDPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [objective, setObjective] = useState("");
  const [budget, setBudget] = useState("");
  const [draftOutput, setDraftOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

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

  const allFilled = projectName.trim() && objective.trim() && budget.trim();

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating || !allFilled) return;
    setGenerating(true);
    setDraftOutput("");

    await streamFromProxy({
      systemPrompt: BONUS_D_SUBVENTION_PROMPT,
      messages: [{
        role: "user",
        content: `Nom du projet : ${projectName}\nObjectif principal : ${objective}\nBudget estimé : ${budget}`,
      }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setDraftOutput((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, allFilled, projectName, objective, budget]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { projectName, objective, budget, draft: draftOutput },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
  }, [teamId, submitState, projectName, objective, budget, draftOutput]);

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
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              Bonus D — Brouillon de subvention
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              8 minutes chrono pour un premier jet
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={480} startedAt={startedAt} />
          </div>
        </div>

        {/* Inputs */}
        <section className="mb-8 flex flex-col gap-4">
          <div>
            <label className="font-bold text-black block mb-1">
              Nom du projet
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={!!draftOutput}
              placeholder="Ex : Atelier IA inclusif pour les ESRP"
              className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="font-bold text-black block mb-1">
              Objectif principal
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={!!draftOutput}
              placeholder="Ex : Former 200 professionnels ESRP à l'usage raisonné de l'IA..."
              rows={3}
              className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50 resize-none"
            />
          </div>
          <div>
            <label className="font-bold text-black block mb-1">
              Budget estimé
            </label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={!!draftOutput}
              placeholder="Ex : 15 000 € sur 12 mois"
              className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
            />
          </div>
        </section>

        {/* Generate */}
        {!draftOutput && !generating && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleGenerate}
              disabled={!allFilled}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
            >
              Générer le brouillon
            </button>
          </div>
        )}

        {/* Output */}
        {(draftOutput || generating) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Brouillon de dossier
            </h2>
            <StreamedOutput content={draftOutput} loading={generating} />
          </section>
        )}

        {/* Submit */}
        {draftOutput && !generating && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
