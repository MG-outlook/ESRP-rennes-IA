"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps every team in sync with the animator. Polls the workshop state and
 * routes the team to:
 *   - an assigned but unfinished bonus (team_progress challenge_id >= 100), else
 *   - the globally active challenge (workshop_state.active_challenge_id > 0), else
 *   - the lobby (waiting room).
 *
 * A per-team bonus takes priority over the global active challenge: when the
 * animator activates a bonus for one team (typically while it waits on the Défi 5
 * end screen), that team must move to the bonus immediately even though the
 * global active challenge hasn't changed.
 *
 * The porte gate is never interrupted: while a team is on /porte we leave it
 * alone until it validates and moves to /lobby on its own.
 */
export default function ChallengeNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let teamId: string | null = null;

    async function resolveTeam(): Promise<string | null> {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("team_sessions")
        .select("team_id")
        .eq("auth_uid", user.id)
        .maybeSingle();
      return data?.team_id ?? null;
    }

    async function tick() {
      if (!active) return;
      const path = pathRef.current;
      if (!path || path.startsWith("/porte")) return;

      if (!teamId) teamId = await resolveTeam();
      if (!teamId) return;

      const [{ data: state }, { data: bonus }] = await Promise.all([
        supabase
          .from("workshop_state")
          .select("active_challenge_id, active_challenge_ids")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("team_progress")
          .select("challenge_id")
          .eq("team_id", teamId)
          .is("finished_at", null)
          .gte("challenge_id", 100)
          .order("challenge_id", { ascending: false })
          .limit(1),
      ]);

      // The set of currently-open challenges. Several can be open at once;
      // fall back to the legacy single field for rows written before the
      // multi-open migration.
      const openIds: number[] = (
        state?.active_challenge_ids?.length
          ? state.active_challenge_ids
          : state?.active_challenge_id != null
            ? [state.active_challenge_id]
            : []
      ).filter((id: number) => id > 0);

      async function isFinished(challengeId: number): Promise<boolean> {
        const { data: ap } = await supabase
          .from("team_progress")
          .select("finished_at")
          .eq("team_id", teamId!)
          .eq("challenge_id", challengeId)
          .maybeSingle();
        return !!ap && ap.finished_at !== null;
      }

      let target = "/lobby";
      const onChallengeMatch = path.match(/^\/challenge\/(\d+)/);
      const onChallengeId = onChallengeMatch ? Number(onChallengeMatch[1]) : null;

      if (bonus && bonus.length > 0) {
        // A pending bonus takes priority over the global open challenges.
        target = `/challenge/${bonus[0].challenge_id}`;
      } else if (openIds.length === 1) {
        // Single challenge open: keep the guided, lockstep behaviour — push the
        // team there unless it already finished it (then it waits in the lobby).
        const id = openIds[0];
        if (!(await isFinished(id))) target = `/challenge/${id}`;
      } else if (openIds.length > 1) {
        // Several challenges open: teams pick from the lobby menu. Don't yank a
        // team off a challenge it's currently (and validly) working on.
        if (
          onChallengeId !== null &&
          openIds.includes(onChallengeId) &&
          !(await isFinished(onChallengeId))
        ) {
          target = `/challenge/${onChallengeId}`;
        }
      }

      const current = pathRef.current;
      if (active && current && !current.startsWith("/porte") && current !== target) {
        router.replace(target);
      }
    }

    tick();
    const interval = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
