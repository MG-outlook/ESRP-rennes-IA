"use client";

import { usePauseSync } from "@/lib/hooks/usePauseSync";

export default function PauseOverlay() {
  const { isPaused, pauseReason } = usePauseSync();

  if (!isPaused) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex items-center justify-center p-8"
      role="alertdialog"
      aria-modal="true"
      aria-label="Atelier en pause"
    >
      <div className="text-center">
        <p className="text-3xl font-bold text-black mb-6">Pause</p>
        {pauseReason && (
          <p className="text-xl text-[#4A4A4A]">{pauseReason}</p>
        )}
      </div>
    </div>
  );
}
