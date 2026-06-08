"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePauseSync() {
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadState() {
      const { data } = await supabase
        .from("workshop_state")
        .select("is_paused, pause_reason")
        .eq("id", "main")
        .maybeSingle();

      if (!mounted || !data) return;
      setIsPaused(Boolean(data.is_paused));
      setPauseReason(data.pause_reason ?? null);
    }

    loadState();

    const channel = supabase
      .channel("workshop-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workshop_state" },
        (payload) => {
          const next = payload.new as { is_paused?: boolean; pause_reason?: string | null };
          setIsPaused(Boolean(next.is_paused));
          setPauseReason(next.pause_reason ?? null);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { isPaused, pauseReason };
}
