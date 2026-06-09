"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_F_JOURNAL_PROMPT, BONUS_F_MOMENTS } from "@/lib/ai/prompts";

const CHALLENGE_ID = 106;

export default function BonusFPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [moment, setMoment] = useState("");
  const [journal, setJournal] = useState("");
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

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating || !moment.trim()) return;
    setGenerating(true);
    setJournal("");
    await streamFromProxy({
      systemPrompt: BONUS_F_JOURNAL_PROMPT,
      messages: [{ role: "user", content: `Moment choisi : ${moment}` }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 500,
      onChunk: (t) => setJournal((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, moment]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { moment, journal },
      ai_provider: "proxy",
      model: "ai-proxy",
    });
    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);
    setSubmitState("done");
  }, [teamId, submitState, moment, journal]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">Bonus F — Le journal de Camille</h1>
            <p className="text-[#4A4A4A] mt-2">
              Écrivez avec l&apos;IA, à la première personne, un fragment du journal de Camille.
            </p>
          </div>
          <Timer durationSec={720} startedAt={startedAt} />
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">Choisissez un moment</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {BONUS_F_MOMENTS.map((m) => (
              <button
                key={m}
                onClick={() => setMoment(m)}
                disabled={!!journal || generating}
                className={`px-3 py-2 border-2 text-sm font-semibold ${
                  moment === m
                    ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                    : "bg-white border-black text-black"
                } disabled:opacity-50`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            disabled={!!journal || generating}
            placeholder="…ou décrivez votre propre moment"
            className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
          />
        </section>

        {!journal && !generating && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleGenerate}
              disabled={!moment.trim()}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
            >
              Écrire le journal
            </button>
          </div>
        )}

        {(journal || generating) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Le journal de Camille</h2>
            <div className="border-2 border-black p-6 bg-[#F5F5F5] italic">
              <StreamedOutput content={journal} loading={generating} />
            </div>
          </section>
        )}

        {journal && !generating && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
