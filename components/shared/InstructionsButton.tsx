"use client";

import { useState } from "react";
import type { ChallengeIntroContent } from "@/lib/challenges/intros";

/**
 * "Rappel des instructions" — a small header button that reopens the challenge's
 * "Comment ça marche" content in a modal, so a team that paused or forgot can
 * re-read the rules without leaving the challenge. Reuses CHALLENGE_INTROS.
 */
export default function InstructionsButton({
  content,
}: {
  content?: ChallengeIntroContent;
}) {
  const [open, setOpen] = useState(false);
  if (!content) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Revoir les instructions du défi"
        className="shrink-0 px-3 py-2 border-2 border-[#2D5A3D] text-[#2D5A3D] font-semibold text-sm hover:bg-[#2D5A3D] hover:text-white transition-colors"
      >
        Instructions
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white border-2 border-black max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-black">Comment ça marche</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="text-2xl leading-none text-[#4A4A4A] hover:text-black px-2"
              >
                ✕
              </button>
            </div>

            <p className="font-bold text-black">{content.title}</p>
            {content.subtitle && (
              <p className="italic text-[#4A4A4A] mt-1 mb-4">{content.subtitle}</p>
            )}

            <ol className="list-decimal pl-6 space-y-2 text-black text-lg">
              {content.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>

            {content.note && (
              <p className="italic text-[#4A4A4A] mt-4 border-t-2 border-[#E0E0E0] pt-3">
                {content.note}
              </p>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setOpen(false)}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] hover:bg-[#234a31] transition-colors"
              >
                Reprendre le défi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
