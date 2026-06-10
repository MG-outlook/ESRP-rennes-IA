"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin/client";
import { getAIStatus, onAIStatusChange, startHealthCheck } from "@/lib/ai/health";
import Skeleton from "@/components/shared/Skeleton";
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
  progressPhase: string;
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
  if (comp.admin) parts.push(`${comp.admin}A`);
  if (comp.medico_psy) parts.push(`${comp.medico_psy}MP`);
  if (comp.formateur) parts.push(`${comp.formateur}F`);
  if (comp.insertion_pro) parts.push(`${comp.insertion_pro}IP`);
  if (comp.autre) parts.push(`${comp.autre}?`);
  return parts.join(" ") || "—";
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

    // Determine current challenge per team
    const progressMap: Record<string, { challengeId: number; finished: boolean }[]> = {};
    if (progressData) {
      for (const p of progressData) {
        if (!progressMap[p.team_id]) progressMap[p.team_id] = [];
        progressMap[p.team_id].push({
          challengeId: p.challenge_id,
          finished: !!p.finished_at,
        });
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
        progressPhase,
      };
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
    <main className="min-h-screen bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-black">Dashboard — Vue projetée</h1>
        <div className={`px-4 py-2 border-2 font-semibold text-sm ${
          aiStatus === "ok"
            ? "border-[#2D5A3D] text-[#2D5A3D]"
            : "border-black bg-black text-white"
        }`}>
          {aiStatus === "ok" ? "IA : OK" : "IA : MODE DÉGRADÉ"}
        </div>
      </div>

      {/* 2×5 Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="border-2 border-black p-4">
              <Skeleton className="h-6 w-1/2 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {teams.map((team) => (
          <div
            key={team.id}
            className="border-2 border-black p-4 flex flex-col gap-2 cursor-pointer hover:border-[#2D5A3D]"
            onClick={() => openDetails(team.id)}
          >
            {/* Code + animator */}
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-black">{team.code}</span>
              <span className="text-sm text-[#4A4A4A] capitalize">{team.animator ?? ""}</span>
            </div>

            {/* Password */}
            <p className="text-lg font-semibold text-[#2D5A3D] truncate">
              {team.password ?? "—"}
            </p>

            {/* Composition */}
            <p className="text-sm text-[#4A4A4A] font-mono">
              {formatComposition(team.composition)}
            </p>

            {/* Current challenge */}
            <div className="mt-auto pt-2 border-t border-[#B8B8B8]">
              {team.currentChallengeTitle ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-black">
                    {team.currentChallengeTitle}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 ${
                      team.progressPhase === "Terminé"
                        ? "bg-[#2D5A3D] text-white"
                        : "bg-[#F5F5F5] text-[#4A4A4A]"
                    }`}
                  >
                    {team.progressPhase}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-[#B8B8B8]">Pas encore commencé</span>
              )}
            </div>

            {/* Score */}
            <div className="text-right">
              <span className="text-xl font-bold text-black">{team.totalScore}</span>
              <span className="text-sm text-[#4A4A4A]"> pts</span>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Detail modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-2 sm:p-6">
          <div className="bg-white border-2 border-black max-w-3xl w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-black">
                Équipe {teams.find((t) => t.id === selectedTeam)?.code}
              </h2>
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-4 py-2 border-2 border-black text-black font-semibold"
              >
                Fermer
              </button>
            </div>

            {submissions.length === 0 ? (
              <p className="text-[#4A4A4A]">Aucune soumission.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {submissions.map((sub) => {
                  const teamCode = teams.find((t) => t.id === selectedTeam)?.code ?? "equipe";
                  const points = computeChallengeScore(sub.challenge_id, sub.payload);
                  const docs = extractDocuments(sub.payload);
                  return (
                    <div key={sub.id} className="border-2 border-black p-4">
                      <div className="flex justify-between items-center text-sm mb-2 flex-wrap gap-2">
                        <span className="font-bold text-black">
                          Défi {sub.challenge_id} — {challengeTitle(sub.challenge_id)}
                        </span>
                        <span className="flex items-center gap-3 text-[#4A4A4A]">
                          {points != null && (
                            <span className="font-bold text-[#2D5A3D]">{points}/20</span>
                          )}
                          <span>{new Date(sub.created_at).toLocaleTimeString("fr-FR")}</span>
                        </span>
                      </div>

                      {docs.length === 0 ? (
                        <p className="text-sm text-[#B8B8B8]">Pas de document texte.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {docs.map((doc, i) => (
                            <div key={i} className="border border-[#B8B8B8] p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-black text-sm">
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
                                  className="text-xs px-3 py-1 border-2 border-[#2D5A3D] text-[#2D5A3D] font-semibold hover:bg-[#2D5A3D] hover:text-white"
                                >
                                  Télécharger .md
                                </button>
                              </div>
                              <div className="text-sm max-h-[260px] overflow-y-auto border-t border-[#E0E0E0] pt-2">
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
