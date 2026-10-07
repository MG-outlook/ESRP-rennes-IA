"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin/client";
import { getAIStatus, onAIStatusChange, startHealthCheck } from "@/lib/ai/health";
import Link from "next/link";
import Skeleton from "@/components/shared/Skeleton";
import Icon from "@/components/shared/Icon";
import Markdown from "@/components/shared/Markdown";
import {
  challengeTitle,
  computeChallengeScore,
  extractDocuments,
} from "@/lib/scoring";

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ProgressRow {
  team_id: string;
  challenge_id: number;
  started_at: string | null;
  finished_at: string | null;
}

interface TeamRow {
  id: string;
  code: string;
  password: string | null;
  animator: string | null;
  composition: Record<string, number> | null;
}

interface TeamData {
  id: string;
  code: string;
  password: string | null;
  animator: string | null;
  composition: Record<string, number> | null;
  currentChallenge: number | null;
  currentChallengeTitle: string | null;
  totalScore: number;
  totalTimeMs: number;
  progressPhase: string;
}

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}min ${s.toString().padStart(2, "0")}s`;
}

interface SubmissionDetail {
  id: string;
  challenge_id: number;
  ai_provider: string;
  created_at: string;
  payload: Record<string, unknown>;
}

function formatComposition(comp: Record<string, number> | null): string {
  if (!comp) return "—";
  const parts: string[] = [];
  if (comp.formateur) parts.push(`Formation ${comp.formateur}`);
  if (comp.medico_psy) parts.push(`Médico-psy ${comp.medico_psy}`);
  if (comp.insertion_pro) parts.push(`Insertion ${comp.insertion_pro}`);
  if (comp.admin) parts.push(`Admin ${comp.admin}`);
  if (comp.autre) parts.push(`Autre ${comp.autre}`);
  return parts.join(" · ") || "—";
}

export default function DashboardPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [aiStatus, setAiStatus] = useState(getAIStatus);

  const fetchAll = useCallback(async () => {
    let teamsData: TeamRow[];
    let progressData: ProgressRow[];
    let scoresData: { team_id: string; score: number }[];
    try {
      const data = await adminFetch<{
        teams: TeamRow[];
        progress: ProgressRow[];
        scores: { team_id: string; score: number }[];
      }>("get_dashboard");
      teamsData = data.teams;
      progressData = data.progress;
      scoresData = data.scores;
    } catch {
      setLoading(false);
      return;
    }

    const scoreMap: Record<string, number> = {};
    if (scoresData) {
      for (const s of scoresData) {
        scoreMap[s.team_id] = (scoreMap[s.team_id] ?? 0) + Number(s.score);
      }
    }

    // Determine current challenge + total time per team
    const progressMap: Record<string, { challengeId: number; finished: boolean }[]> = {};
    const timeMap: Record<string, number> = {};
    if (progressData) {
      for (const p of progressData) {
        if (!progressMap[p.team_id]) progressMap[p.team_id] = [];
        progressMap[p.team_id].push({
          challengeId: p.challenge_id,
          finished: !!p.finished_at,
        });
        if (p.started_at && p.finished_at) {
          const ms =
            new Date(p.finished_at).getTime() - new Date(p.started_at).getTime();
          if (ms > 0) timeMap[p.team_id] = (timeMap[p.team_id] ?? 0) + ms;
        }
      }
    }

    const result: TeamData[] = teamsData.map((t) => {
      const progress = progressMap[t.id] ?? [];
      const current = progress.find((p) => !p.finished);
      const lastFinished = progress.find((p) => p.finished);

      let currentChallenge: number | null = null;
      let progressPhase = "—";

      if (current) {
        currentChallenge = current.challengeId;
        progressPhase = "En cours";
      } else if (lastFinished) {
        currentChallenge = lastFinished.challengeId;
        progressPhase = "Terminé";
      }

      return {
        id: t.id,
        code: t.code,
        password: t.password,
        animator: t.animator,
        composition: t.composition as Record<string, number> | null,
        currentChallenge,
        currentChallengeTitle:
          currentChallenge !== null ? challengeTitle(currentChallenge) : null,
        totalScore: scoreMap[t.id] ?? 0,
        totalTimeMs: timeMap[t.id] ?? 0,
        progressPhase,
      };
    });

    // Ranking: most points first; on a tie, the fastest team (least total time).
    result.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.totalTimeMs - b.totalTimeMs;
    });

    setTeams(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    startHealthCheck();
    return onAIStatusChange(setAiStatus);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 4000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const openDetails = useCallback(async (teamId: string) => {
    setSelectedTeam(teamId);
    try {
      const { submissions } = await adminFetch<{
        submissions: SubmissionDetail[];
      }>("get_submissions", { team_id: teamId });
      // Keep only the latest submission per challenge (already sorted desc).
      const seen = new Set<number>();
      const latest = submissions.filter((s) => {
        if (seen.has(s.challenge_id)) return false;
        seen.add(s.challenge_id);
        return true;
      });
      latest.sort((a, b) => a.challenge_id - b.challenge_id);
      setSubmissions(latest);
    } catch {
      setSubmissions([]);
    }
  }, []);

  return (
    <main className="flex-1 bg-surface">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl sm:text-4xl">Tableau de bord</h1>
          <p className="text-ink-2">
            Vue projetée des équipes. Cliquez sur une équipe pour lire ses productions.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            role="status"
            className={`badge h-11 px-4 text-base ${
              aiStatus === "ok"
                ? "bg-success-soft text-success-strong"
                : "bg-warning-soft text-warning"
            }`}
          >
            {aiStatus === "ok" ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-success" aria-hidden />
                IA disponible
              </>
            ) : (
              <>
                <Icon name="alert" size={18} strokeWidth={2.4} />
                IA en mode dégradé
              </>
            )}
          </span>
          <Link href="/classement" className="btn btn-secondary px-4">
            <Icon name="trophy" size={18} />
            Classement final
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white border border-line rounded-xl p-4">
              <Skeleton className="h-6 w-1/2 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4">
        {teams.map((team, idx) => (
          <li key={team.id}>
          <button
            type="button"
            className="w-full h-full text-left flex flex-col gap-2.5 p-[18px] bg-white border border-line rounded-xl hover:border-brand transition-colors"
            onClick={() => openDetails(team.id)}
            aria-label={`Équipe ${team.code}, rang ${idx + 1}, ${team.totalScore} points. Voir les productions`}
          >
            <span className="w-full flex justify-between items-center gap-2">
              <span className="flex items-center gap-2.5">
                <span
                  className={`w-[30px] h-[30px] rounded-full inline-flex items-center justify-center text-[0.85rem] font-extrabold ${
                    idx === 0 ? "bg-brand text-white" : "bg-brand-soft text-brand"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="font-mono text-[1.6rem] font-bold">{team.code}</span>
              </span>
              <span className="text-[0.85rem] text-ink-2 capitalize">{team.animator ?? ""}</span>
            </span>

            {team.password ? (
              <span className="font-mono text-[0.9rem] font-bold text-success-strong break-all">
                {team.password}
              </span>
            ) : (
              <span className="text-[0.9rem] text-muted">Encore à la Porte</span>
            )}

            <span className="text-[0.8rem] leading-snug text-ink-2">
              {formatComposition(team.composition)}
            </span>

            <span className="w-full mt-auto pt-2.5 border-t border-line flex justify-between items-center gap-2">
              {team.currentChallengeTitle ? (
                <>
                  <span className="text-[0.85rem] font-bold leading-snug">
                    {team.currentChallengeTitle}
                  </span>
                  {team.progressPhase === "Terminé" ? (
                    <span className="badge bg-success-soft text-success-strong">
                      <Icon name="check" size={13} strokeWidth={3} />
                      Terminé
                    </span>
                  ) : (
                    <span className="badge bg-brand-soft text-brand-strong">
                      <span className="w-[7px] h-[7px] rounded-full bg-brand" aria-hidden />
                      {team.progressPhase}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[0.85rem] text-muted">Pas encore commencé</span>
              )}
            </span>

            <span className="w-full flex justify-between items-baseline">
              <span className="text-[0.8rem] text-ink-2">{formatMs(team.totalTimeMs)}</span>
              <span>
                <strong className="text-2xl font-extrabold">{team.totalScore}</strong>
                <span className="text-[0.85rem] text-ink-2"> pts</span>
              </span>
            </span>
          </button>
          </li>
        ))}
      </ul>
      )}
      </div>

      {/* Detail modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-40 bg-ink/40 flex items-center justify-center p-2 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Productions de l'équipe ${teams.find((t) => t.id === selectedTeam)?.code ?? ""}`}
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-ink">
                Équipe {teams.find((t) => t.id === selectedTeam)?.code}
              </h2>
              <button
                onClick={() => setSelectedTeam(null)}
                className="btn btn-secondary px-4 py-2 "
              >
                Fermer
              </button>
            </div>

            {submissions.length === 0 ? (
              <p className="text-ink-2">Aucune soumission.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {submissions.map((sub) => {
                  const teamCode = teams.find((t) => t.id === selectedTeam)?.code ?? "equipe";
                  const points = computeChallengeScore(sub.challenge_id, sub.payload);
                  const docs = extractDocuments(sub.payload);
                  return (
                    <div key={sub.id} className="border p-4 border-line">
                      <div className="flex justify-between items-center text-sm mb-2 flex-wrap gap-2">
                        <span className="font-bold text-ink">
                          Défi {sub.challenge_id} — {challengeTitle(sub.challenge_id)}
                        </span>
                        <span className="flex items-center gap-3 text-ink-2">
                          {points != null && (
                            <span className="font-bold text-ink">{points}/20</span>
                          )}
                          <span>{new Date(sub.created_at).toLocaleTimeString("fr-FR")}</span>
                        </span>
                      </div>

                      {docs.length === 0 ? (
                        <p className="text-sm text-muted">Pas de document texte.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {docs.map((doc, i) => (
                            <div key={i} className="border border-line p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-ink text-sm">
                                  {doc.label}
                                </span>
                                <button
                                  onClick={() =>
                                    downloadMarkdown(
                                      `${teamCode}-defi${sub.challenge_id}-${doc.label
                                        .toLowerCase()
                                        .replace(/[^a-z0-9]+/g, "-")}.md`,
                                      doc.markdown
                                    )
                                  }
                                  className="btn btn-secondary text-xs px-3 py-1 "
                                >
                                  Télécharger .md
                                </button>
                              </div>
                              <div className="text-sm max-h-[260px] overflow-y-auto border-t border-line pt-2">
                                <Markdown content={doc.markdown} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
