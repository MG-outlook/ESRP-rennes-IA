"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import PredictionWidget from "@/components/shared/PredictionWidget";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  BONUS_A_DOUBLONS_PROMPT,
  BONUS_A_REPORTS,
  BONUS_A_DOUBLON_COUNT,
} from "@/lib/ai/prompts";

const CHALLENGE_ID = 101;

export default function BonusAPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);
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

  const handleLockPrediction = useCallback(
    async (value: unknown) => {
      const v = value as number;
      setPrediction(v);
      setPredictionLocked(true);
      if (!teamId) return;
      const supabase = createClient();
      await supabase.from("predictions").insert({
        team_id: teamId,
        challenge_id: CHALLENGE_ID,
        predicted: { doublons: v },
      });
    },
    [teamId]
  );

  const handleAnalyze = useCallback(async () => {
    if (!teamId || generating) return;
    setGenerating(true);
    setAnalysis("");
    const reports = BONUS_A_REPORTS.map(
      (r) => `### ${r.role}\n${r.content}`
    ).join("\n\n");
    await streamFromProxy({
      systemPrompt: BONUS_A_DOUBLONS_PROMPT,
      messages: [{ role: "user", content: `Voici les 4 rapports :\n\n${reports}` }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setAnalysis((p) => p + t),
      onDone: () => {
        setGenerating(false);
        setRevealed(true);
      },
      onError: () => setGenerating(false),
    });
  }, [teamId, generating]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { prediction, actual: BONUS_A_DOUBLON_COUNT, analysis },
      ai_provider: "proxy",
      model: "ai-proxy",
    });
    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);
    setSubmitState("done");
  }, [teamId, submitState, prediction, analysis]);

  const ecart =
    prediction !== null ? Math.abs(prediction - BONUS_A_DOUBLON_COUNT) : null;

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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              Bonus A — Le détective des doublons
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              4 rapports sur Camille. Combien d&apos;informations sont répétées ?
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={600} startedAt={startedAt} />
          </div>
        </div>

        <section className="mb-8 grid md:grid-cols-2 gap-4">
          {BONUS_A_REPORTS.map((r) => (
            <article key={r.role} className="border-2 border-black p-4">
              <h3 className="font-bold text-black mb-2">{r.role}</h3>
              <p className="text-sm text-[#4A4A4A]">{r.content}</p>
            </article>
          ))}
        </section>

        {!predictionLocked && (
          <section className="border-2 border-black p-6 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Votre pari : combien de doublons ?
            </h2>
            <PredictionWidget
              schema={{ field: "doublons", min: 0, max: 6 }}
              onSubmit={handleLockPrediction}
            />
          </section>
        )}

        {predictionLocked && !revealed && !generating && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleAnalyze}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
            >
              Lancer l&apos;analyse de l&apos;IA
            </button>
          </div>
        )}

        {(generating || analysis) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Analyse des redondances
            </h2>
            <StreamedOutput content={analysis} loading={generating} />
          </section>
        )}

        {revealed && (
          <section className="border-2 border-[#2D5A3D] p-6 mb-8 bg-[#F5F5F5]">
            <p className="text-black">
              Doublons réels : <strong>{BONUS_A_DOUBLON_COUNT}</strong> — votre
              pari : <strong>{prediction}</strong> (écart {ecart}).
            </p>
          </section>
        )}

        {revealed && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
