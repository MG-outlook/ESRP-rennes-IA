"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps every team in sync with the animator. Polls the workshop state and
 * routes the team to:
 *   - the globally active challenge (workshop_state.active_challenge_id > 0), else
 *   - an assigned but unfinished bonus (team_progress challenge_id >= 100), else
 *   - the lobby (waiting room).
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

      const { data: state } = await supabase
        .from("workshop_state")
        .select("active_challenge_id")
        .eq("id", 1)
        .maybeSingle();

      let target = "/lobby";
      const activeId = state?.active_challenge_id ?? null;

      if (activeId !== null && activeId > 0) {
        target = `/challenge/${activeId}`;
      } else {
        const { data: bonus } = await supabase
          .from("team_progress")
          .select("challenge_id")
          .eq("team_id", teamId)
          .is("finished_at", null)
          .gte("challenge_id", 100)
          .order("challenge_id", { ascending: false })
          .limit(1);
        if (bonus && bonus.length > 0) {
          target = `/challenge/${bonus[0].challenge_id}`;
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
