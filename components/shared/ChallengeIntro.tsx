"use client";

import { ReactNode } from "react";
import Icon from "@/components/shared/Icon";

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
  const [kicker, ...rest] = title.split(" — ");
  const name = rest.join(" — ") || kicker;

  return (
    <div className="flex-1 bg-white">
      <div className="max-w-[820px] mx-auto px-6 pt-10 pb-16 flex flex-col gap-9">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3 flex-wrap text-base">
            {rest.length > 0 && <span className="font-bold text-brand">{kicker}</span>}
            {duration && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface text-ink-2">
                <Icon name="clock" size={16} />
                {duration}
              </span>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl leading-[1.1]">{name}</h1>
          {subtitle && <p className="text-ink-2 text-xl">{subtitle}</p>}
        </div>

        {(objective || pourquoi) && <IntroBlocks objective={objective} pourquoi={pourquoi} />}

        <section className="flex flex-col gap-5">
          <h2 className="text-[1.556rem]">Comment ça marche</h2>
          <ol className="flex flex-col">
            {steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-5 py-4 border-t border-line last:border-b"
              >
                <span className="shrink-0 w-10 h-10 rounded-full bg-brand text-white font-extrabold inline-flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="pt-1.5 text-lg">{step}</div>
              </li>
            ))}
          </ol>
          {note && (
            <p className="text-ink-2">
              <strong className="text-ink">À retenir : </strong>
              {note}
            </p>
          )}
        </section>

        <div>
          <button
            onClick={() => {
              // Repart en haut de la page du défi : on doit voir le titre et
              // les instructions, pas atterrir au milieu si l'intro a scrollé.
              if (typeof window !== "undefined") window.scrollTo(0, 0);
              onStart();
            }}
            className="btn btn-primary min-h-[60px] px-8 text-xl"
          >
            {startLabel}
            <Icon name="arrow-right" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Blocs « Objectif » et « Pourquoi ce défi ? », partagés avec le rappel des consignes. */
export function IntroBlocks({
  objective,
  pourquoi,
  compact = false,
}: {
  objective?: string;
  pourquoi?: string;
  compact?: boolean;
}) {
  const pad = compact ? "p-4" : "p-6";
  const text = compact ? "" : "text-lg";
  return (
    <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]">
      {objective && (
        <section className={`flex flex-col gap-2 ${pad} rounded-xl bg-success-soft`}>
          <h2 className="flex items-center gap-2.5 text-lg text-success-strong">
            <Icon name="target" size={22} />
            Objectif
          </h2>
          <p className={text}>{objective}</p>
        </section>
      )}
      {pourquoi && (
        <section className={`flex flex-col gap-2 ${pad} rounded-xl bg-brand-soft`}>
          <h2 className="flex items-center gap-2.5 text-lg text-brand-strong">
            <Icon name="help" size={22} />
            Pourquoi ce défi ?
          </h2>
          <p className={text}>{pourquoi}</p>
        </section>
      )}
    </div>
  );
}
