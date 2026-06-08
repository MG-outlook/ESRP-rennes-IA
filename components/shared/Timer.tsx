"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  durationSec: number;
  startedAt: string | null;
  onExpire?: () => void;
}

export default function Timer({ durationSec, startedAt, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(durationSec);

  useEffect(() => {
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
  }, [durationSec, startedAt, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining <= 60;

  return (
    <div
      className={`text-4xl font-bold tabular-nums ${
        isLow ? "text-[#8B3A3A]" : "text-black"
      }`}
      role="timer"
      aria-live="polite"
      aria-label={`${minutes} minutes ${seconds} secondes restantes`}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
