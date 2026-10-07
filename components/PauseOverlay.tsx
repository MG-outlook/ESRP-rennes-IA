"use client";

import { usePauseSync } from "@/lib/hooks/usePauseSync";
import Icon from "@/components/shared/Icon";

export default function PauseOverlay() {
  const { isPaused, pauseReason } = usePauseSync();

  if (!isPaused) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-surface flex items-center justify-center p-8"
      role="alertdialog"
      aria-modal="true"
      aria-label="Atelier en pause"
    >
      <div className="w-full max-w-lg bg-white border border-line rounded-xl px-8 py-10 flex flex-col items-center gap-4 text-center">
        <span className="w-14 h-14 rounded-full bg-brand-soft text-brand inline-flex items-center justify-center">
          <Icon name="pause" size={28} strokeWidth={2.6} />
        </span>
        <p className="text-3xl font-extrabold">Pause</p>
        <p className="text-xl text-ink-2">
          {pauseReason || "L'atelier reprend dans un instant. Vos réponses sont gardées."}
        </p>
      </div>
    </div>
  );
}
