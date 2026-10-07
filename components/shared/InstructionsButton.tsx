"use client";

import { useEffect, useState } from "react";
import type { ChallengeIntroContent } from "@/lib/challenges/intros";
import Icon from "@/components/shared/Icon";
import { IntroBlocks } from "@/components/shared/ChallengeIntro";

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!content) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-secondary shrink-0 px-4"
      >
        <Icon name="list" size={18} />
        Consignes
      </button>

      {/* Bouton flottant bas-droite */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Revoir les consignes du défi"
        className="btn btn-secondary fixed bottom-6 right-6 z-40 w-12 h-12 p-0 rounded-full shadow-md"
      >
        <Icon name="help" size={24} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructions-title"
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="font-bold text-brand">{content.title}</p>
                <h2 id="instructions-title" className="text-2xl mt-1">Comment ça marche</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="btn w-11 h-11 p-0 text-ink-2 hover:bg-surface hover:text-ink"
                autoFocus
              >
                <Icon name="x" size={22} />
              </button>
            </div>

            {content.subtitle && <p className="text-ink-2">{content.subtitle}</p>}
            <IntroBlocks objective={content.objective} pourquoi={content.pourquoi} compact />

            <ol className="flex flex-col">
              {content.steps.map((step, i) => (
                <li key={i} className="flex gap-4 py-3 border-t border-line last:border-b">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-brand text-white font-extrabold text-sm inline-flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            {content.note && (
              <p className="text-ink-2">
                <strong className="text-ink">À retenir : </strong>
                {content.note}
              </p>
            )}

            <div className="flex justify-end">
              <button onClick={() => setOpen(false)} className="btn btn-primary px-6 py-3">
                Reprendre le défi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
