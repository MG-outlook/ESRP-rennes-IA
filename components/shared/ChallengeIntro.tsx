"use client";

import { ReactNode } from "react";

interface ChallengeIntroProps {
  title: string;
  subtitle?: string;
  /** One-line learning objective: what this challenge teaches about AI. */
  objective?: string;
  /**
   * "Pourquoi ce défi ?" — 2-3 phrases sur le concept IA démontré et ce que
   * ça change au quotidien. Affiché sous l'objectif, avant les étapes.
   */
  pourquoi?: string;
  /** Numbered "how it works" steps. Plain strings or rich nodes. */
  steps: ReactNode[];
  /** Optional closing note (the pedagogical point of the challenge). */
  note?: ReactNode;
  /** Estimated duration, e.g. "20 min". */
  duration?: string;
  startLabel?: string;
  onStart: () => void;
}

/**
 * Reusable "Comment ça marche" intro screen shown before a challenge begins.
 * Gives participants the rules and the point of the game before they dive in,
 * so the AI steps don't feel arbitrary. Rendered as an early return by each
 * challenge page.
 */
export default function ChallengeIntro({
  title,
  subtitle,
  objective,
  pourquoi,
  steps,
  note,
  duration,
  startLabel = "C'est parti",
  onStart,
}: ChallengeIntroProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-black">{title}</h1>
        {subtitle && (
          <p className="text-[#4A4A4A] mt-3 text-lg italic">{subtitle}</p>
        )}
        {objective && (
          <p className="mt-4 border-l-4 border-[#2D5A3D] bg-[#F0F5F1] px-4 py-3 text-black">
            <span className="font-bold text-[#2D5A3D]">🎯 Objectif — </span>
            {objective}
          </p>
        )}
        {pourquoi && (
          <p className="mt-3 border-l-4 border-black bg-[#F5F5F5] px-4 py-3 text-black">
            <span className="font-bold text-black">💡 Pourquoi ce défi ? </span>
            {pourquoi}
          </p>
        )}

        <section className="border-2 border-black p-8 mt-8 bg-[#F5F5F5]">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-black">Comment ça marche</h2>
            {duration && (
              <span className="text-sm font-semibold text-[#2D5A3D] border-2 border-[#2D5A3D] px-3 py-1">
                ⏱ {duration}
              </span>
            )}
          </div>
          <ol className="list-decimal pl-6 space-y-3 text-black text-lg">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {note && (
            <p className="text-[#4A4A4A] mt-5 italic border-t-2 border-[#E0E0E0] pt-4">
              {note}
            </p>
          )}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => {
                // Repart en haut de la page du défi : on doit voir le titre et
                // les instructions, pas atterrir au milieu si l'intro a scrollé.
                if (typeof window !== "undefined") window.scrollTo(0, 0);
                onStart();
              }}
              className="px-8 py-4 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl hover:bg-[#234a31] transition-colors"
            >
              {startLabel}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
