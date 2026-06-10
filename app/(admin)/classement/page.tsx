"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin/client";

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

const MEDAL = ["🥇", "🥈", "🥉"];

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
    <main className="min-h-screen bg-white p-6 sm:p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-bold text-black text-center mb-2">
          Classement final
        </h1>
        <p className="text-center text-[#4A4A4A] mb-10">
          CAMPUS EPNAK IA · à points égaux, l&apos;équipe la plus rapide l&apos;emporte
        </p>

        {loading ? (
          <p className="text-center text-[#4A4A4A]">Chargement…</p>
        ) : ranked.length === 0 ? (
          <p className="text-center text-[#4A4A4A]">Aucune équipe pour le moment.</p>
        ) : (
          <>
            {/* Podium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 items-end">
              {podium.map((t, i) => (
                <div
                  key={t.id}
                  className={`border-2 border-[#2D5A3D] p-5 text-center ${
                    i === 0 ? "sm:order-2 bg-[#2D5A3D] text-white sm:scale-110" : ""
                  } ${i === 1 ? "sm:order-1 bg-[#F0F5F1]" : ""} ${
                    i === 2 ? "sm:order-3 bg-[#F0F5F1]" : ""
                  }`}
                >
                  <div className="text-5xl mb-2">{MEDAL[i]}</div>
                  <div className="text-3xl font-bold">{t.code}</div>
                  {t.animator && (
                    <div
                      className={`text-sm capitalize ${
                        i === 0 ? "text-white/80" : "text-[#4A4A4A]"
                      }`}
                    >
                      {t.animator}
                    </div>
                  )}
                  <div className="text-4xl font-bold mt-3">{t.score} pts</div>
                  <div
                    className={`text-sm mt-1 ${
                      i === 0 ? "text-white/80" : "text-[#4A4A4A]"
                    }`}
                  >
                    ⏱ {formatMs(t.timeMs)}
                  </div>
                </div>
              ))}
            </div>

            {/* Reste du classement */}
            {rest.length > 0 && (
              <div className="flex flex-col gap-2">
                {rest.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border-2 border-black px-5 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-[#4A4A4A] w-8 text-right">
                        {i + 4}
                      </span>
                      <span className="text-2xl font-bold text-black">{t.code}</span>
                      {t.animator && (
                        <span className="text-sm text-[#4A4A4A] capitalize">
                          {t.animator}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="text-sm text-[#4A4A4A]">⏱ {formatMs(t.timeMs)}</span>
                      <span className="text-2xl font-bold text-black">{t.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
