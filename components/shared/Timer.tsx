"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/shared/Icon";

interface TimerProps {
  durationSec: number;
  startedAt: string | null;
  /** When set, the timer freezes once this challenge is finished by the team. */
  challengeId?: number;
  onExpire?: () => void;
}

export default function Timer({
  durationSec,
  startedAt,
  challengeId,
  onExpire,
}: TimerProps) {
  const [remaining, setRemaining] = useState(durationSec);
  const [frozen, setFrozen] = useState(false);

  // Freeze the timer the moment the team submits this challenge.
  useEffect(() => {
    if (!challengeId || !startedAt || frozen) return;
    const supabase = createClient();
    let active = true;
    let teamId: string | null = null;

    async function poll() {
      if (!active) return;
      if (!teamId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: s } = await supabase
          .from("team_sessions")
          .select("team_id")
          .eq("auth_uid", user.id)
          .maybeSingle();
        teamId = s?.team_id ?? null;
        if (!teamId) return;
      }
      const { data: p } = await supabase
        .from("team_progress")
        .select("finished_at")
        .eq("team_id", teamId)
        .eq("challenge_id", challengeId)
        .maybeSingle();
      if (p?.finished_at && active) {
        const elapsed = Math.floor(
          (new Date(p.finished_at).getTime() - new Date(startedAt!).getTime()) / 1000
        );
        setRemaining(Math.max(0, durationSec - elapsed));
        setFrozen(true);
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [challengeId, startedAt, durationSec, frozen]);

  // Tick down while not frozen.
  useEffect(() => {
    if (frozen) return;
    if (!startedAt) {
      setRemaining(durationSec);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000
      );
      const left = Math.max(0, durationSec - elapsed);
      setRemaining(left);
      if (left === 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [durationSec, startedAt, onExpire, frozen]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining <= 60 && !frozen;

  const tone = frozen
    ? "bg-success-soft border-line text-success-strong"
    : isLow
      ? "bg-danger-soft border-danger text-danger"
      : "bg-white border-line text-ink";

  return (
    <div
      className={`flex flex-col items-end px-4 py-1.5 border-2 rounded-xl ${tone}`}
      role="timer"
      aria-live="polite"
      aria-label={
        frozen
          ? `Temps figé à ${minutes} minutes ${seconds} secondes`
          : `${minutes} minutes ${seconds} secondes restantes`
      }
    >
      <span className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold">
        {frozen ? (
          <>
            <Icon name="check" size={14} strokeWidth={3} />
            Défi terminé
          </>
        ) : isLow ? (
          <>
            <Icon name="clock" size={14} strokeWidth={2.4} />
            Moins d&apos;une minute
          </>
        ) : (
          <span className="font-normal text-ink-2">Temps restant</span>
        )}
      </span>
      <span className="font-mono text-[2rem] leading-tight font-bold tabular-nums">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
