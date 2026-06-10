"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import SubmitButton from "@/components/shared/SubmitButton";
import { BONUS_E_STATEMENTS, type IaVerdict } from "@/lib/ai/prompts";

const CHALLENGE_ID = 105;

const VERDICT_LABEL: Record<IaVerdict, string> = {
  vrai: "Vrai",
  faux: "Faux",
  nuance: "Nuancé",
};

export default function BonusEPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<number, IaVerdict>>({});
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

  const setVote = useCallback((id: number, verdict: IaVerdict) => {
    if (revealed) return;
    setVotes((prev) => ({ ...prev, [id]: verdict }));
  }, [revealed]);

  const score = BONUS_E_STATEMENTS.filter(
    (s) => votes[s.id] === s.verdict
  ).length;

  const handleReveal = useCallback(async () => {
    setRevealed(true);
    if (!teamId) return;
    const supabase = createClient();
    await supabase.from("predictions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      predicted: { votes },
    });
  }, [teamId, votes]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { votes, score, total: BONUS_E_STATEMENTS.length },
      ai_provider: "static",
      model: "ai-proxy",
    });
    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);
    setSubmitState("done");
  }, [teamId, submitState, votes, score]);

  const allVoted = BONUS_E_STATEMENTS.every((s) => votes[s.id]);

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
            <h1 className="text-4xl font-bold text-black">Bonus E — Vrai ou Faux IA</h1>
            <p className="text-[#4A4A4A] mt-2">
              10 affirmations sur l&apos;IA. Vrai, Faux, ou Nuancé ?
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={600} startedAt={startedAt} />
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {BONUS_E_STATEMENTS.map((s) => {
            const vote = votes[s.id];
            const correct = revealed && vote === s.verdict;
            return (
              <div
                key={s.id}
                className={`border-2 p-4 ${
                  revealed
                    ? correct
                      ? "border-[#2D5A3D]"
                      : "border-[#8B3A3A]"
                    : "border-black"
                }`}
              >
                <p className="text-black mb-3">
                  {s.id}. « {s.text} »
                </p>
                <div className="flex gap-2 flex-wrap">
                  {(["vrai", "faux", "nuance"] as IaVerdict[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVote(s.id, v)}
                      disabled={revealed}
                      className={`px-4 py-2 border-2 font-semibold text-sm ${
                        vote === v
                          ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                          : "bg-white border-black text-black"
                      } disabled:opacity-60`}
                    >
                      {VERDICT_LABEL[v]}
                    </button>
                  ))}
                </div>
                {revealed && (
                  <div className="mt-3 border-t border-[#B8B8B8] pt-3">
                    <p className="text-sm font-bold text-[#2D5A3D]">
                      Réponse : {VERDICT_LABEL[s.verdict]}
                    </p>
                    <p className="text-sm text-[#4A4A4A] mt-1">{s.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!revealed ? (
          <div className="flex justify-center">
            <button
              onClick={handleReveal}
              disabled={!allVoted}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
            >
              Révéler les réponses
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-2xl font-bold text-black">
              Score : {score} / {BONUS_E_STATEMENTS.length}
            </p>
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
