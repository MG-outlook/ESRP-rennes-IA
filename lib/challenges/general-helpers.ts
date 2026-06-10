"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Resolves the team + starts (or restores) the team_progress row. */
export function useChallengeInit(challengeId: number) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        .eq("challenge_id", challengeId)
        .single();
      if (progress?.started_at) {
        setStartedAt(progress.started_at);
      } else {
        const now = new Date().toISOString();
        await supabase.from("team_progress").upsert({
          team_id: session.team_id,
          challenge_id: challengeId,
          started_at: now,
        });
        setStartedAt(now);
      }
    })();
  }, [challengeId]);

  return { teamId, startedAt };
}

/** Records a submission and marks the challenge finished. */
export async function finishChallenge(
  challengeId: number,
  teamId: string,
  payload: Record<string, unknown>
) {
  const supabase = createClient();
  await supabase.from("submissions").insert({
    team_id: teamId,
    challenge_id: challengeId,
    payload,
    ai_provider: "proxy",
    model: "ai-proxy",
  });
  await supabase
    .from("team_progress")
    .update({ finished_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("challenge_id", challengeId);
}

/** Extracts the first {...} JSON object from a model response, or null. */
export function parseJsonObject<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
