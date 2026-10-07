"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin/client";
import { BrandLogo, BrandStripe } from "@/components/shared/Brand";
import Icon from "@/components/shared/Icon";
import Spinner from "@/components/shared/Spinner";

interface TeamRow {
  id: string;
  code: string;
  animator: string | null;
}
interface ProgressRow {
  team_id: string;
  started_at: string | null;
  finished_at: string | null;
}
interface ScoreRow {
  team_id: string;
  score: number;
}

interface Ranked {
  id: string;
  code: string;
  animator: string | null;
  score: number;
  timeMs: number;
}

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}min ${s.toString().padStart(2, "0")}s`;
}

const PLACE = ["1re place", "2e place", "3e place"];
const PODIUM_STYLE = [
  { card: "bg-brand text-white", sub: "text-white/85" },
  { card: "bg-brand-soft text-ink", sub: "text-ink-2" },
  { card: "bg-success-soft text-ink", sub: "text-ink-2" },
];

export default function ClassementPage() {
  const [ranked, setRanked] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { teams, progress, scores } = await adminFetch<{
        teams: TeamRow[];
        progress: ProgressRow[];
        scores: ScoreRow[];
      }>("get_dashboard");

      const scoreMap: Record<string, number> = {};
      for (const s of scores ?? []) scoreMap[s.team_id] = Number(s.score);

      const timeMap: Record<string, number> = {};
      for (const p of progress ?? []) {
        if (p.started_at && p.finished_at) {
          const ms =
            new Date(p.finished_at).getTime() - new Date(p.started_at).getTime();
          if (ms > 0) timeMap[p.team_id] = (timeMap[p.team_id] ?? 0) + ms;
        }
      }

      const list: Ranked[] = (teams ?? []).map((t) => ({
        id: t.id,
        code: t.code,
        animator: t.animator,
        score: scoreMap[t.id] ?? 0,
        timeMs: timeMap[t.id] ?? 0,
      }));
      list.sort((a, b) =>
        b.score !== a.score ? b.score - a.score : a.timeMs - b.timeMs
      );
      setRanked(list);
    } catch {
      /* keep last data */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <BrandStripe />
      <main className="flex-1 w-full max-w-[1180px] mx-auto px-6 sm:px-8 py-10 sm:py-12 flex flex-col gap-10">
        <div className="flex justify-between items-end gap-6 flex-wrap">
          <div className="flex flex-col gap-3">
            <BrandLogo height={48} priority />
            <h1 className="text-5xl sm:text-6xl leading-[1.05]">Classement final</h1>
          </div>
          <p className="text-ink-2 text-lg max-w-[22em]">
            À points égaux, l&apos;équipe la plus rapide l&apos;emporte.
          </p>
        </div>

        {loading ? (
          <p className="text-ink-2 inline-flex items-center gap-3">
            <Spinner size="sm" /> Chargement…
          </p>
        ) : ranked.length === 0 ? (
          <p className="text-ink-2">Aucune équipe pour le moment.</p>
        ) : (
          <>
            <ol aria-label="Podium" className="grid gap-5 sm:grid-cols-3">
              {podium.map((t, i) => (
                <li
                  key={t.id}
                  className={`flex flex-col gap-3.5 p-8 rounded-2xl ${PODIUM_STYLE[i].card}`}
                >
                  <span className="flex justify-between items-baseline gap-3">
                    <span className={`text-xl font-bold ${PODIUM_STYLE[i].sub}`}>{PLACE[i]}</span>
                    <span className={`inline-flex items-center gap-1.5 ${PODIUM_STYLE[i].sub}`}>
                      <Icon name="clock" size={16} />
                      {formatMs(t.timeMs)}
                    </span>
                  </span>
                  <span className="font-mono text-5xl sm:text-6xl leading-none font-bold">{t.code}</span>
                  <span className="mt-auto text-5xl sm:text-6xl leading-none font-extrabold">
                    {t.score} <span className="text-2xl font-bold">pts</span>
                  </span>
                </li>
              ))}
            </ol>

            {rest.length > 0 && (
              <ol start={4} aria-label="Suite du classement" className="flex flex-col border-t-2 border-ink">
                {rest.map((t, i) => (
                  <li
                    key={t.id}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] items-baseline gap-4 sm:gap-6 px-2 py-4 border-b border-line"
                  >
                    <span className="text-2xl font-extrabold text-ink-2 text-right">{i + 4}</span>
                    <span className="font-mono text-2xl sm:text-3xl font-bold">{t.code}</span>
                    <span className="text-ink-2 whitespace-nowrap">{formatMs(t.timeMs)}</span>
                    <span className="text-2xl sm:text-3xl font-extrabold whitespace-nowrap">
                      {t.score} <span className="text-base font-bold text-ink-2">pts</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </main>
    </div>
  );
}
