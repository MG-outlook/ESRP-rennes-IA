"use client";

import type { GeneralVerdict } from "@/lib/ai/general-prompts";

/** Shared verdict card for the generalist challenges (total /20 + breakdown). */
export default function Verdict({ verdict }: { verdict: GeneralVerdict }) {
  return (
    <div>
      <div className="rounded-xl p-6 bg-brand-soft text-center mb-5">
        <p className="text-sm font-bold text-brand-strong">Score</p>
        <p className="text-5xl font-extrabold text-brand-strong">{verdict.total}/20</p>
      </div>

      {verdict.details?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {verdict.details.map((d, i) => (
            <div key={i} className="border p-4 text-center border-line">
              <div className="text-sm text-ink-2">{d.label}</div>
              <div
                className={`text-2xl font-bold ${
                  d.score < 0 ? "text-danger" : "text-ink"
                }`}
              >
                {d.score}/{d.max}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {verdict.point_fort && (
          <div className="rounded-lg px-4 py-3 bg-success-soft">
            <span className="font-bold text-success-strong">Point fort : </span>
            <span className="text-ink">{verdict.point_fort}</span>
          </div>
        )}
        {verdict.a_ameliorer && (
          <div className="rounded-lg px-4 py-3 bg-warning-soft">
            <span className="font-bold text-warning">À améliorer : </span>
            <span className="text-ink">{verdict.a_ameliorer}</span>
          </div>
        )}
        {verdict.conseil && (
          <div className="rounded-lg px-4 py-3 bg-surface">
            <span className="font-bold text-ink-2">Conseil : </span>
            <span className="text-ink">{verdict.conseil}</span>
          </div>
        )}
      </div>
    </div>
  );
}
