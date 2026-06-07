"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAIStatus, onAIStatusChange, startHealthCheck } from "@/lib/ai/health";
import Skeleton from "@/components/shared/Skeleton";

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

const CHALLENGE_TITLES: Record<number, string> = {
  0: "La Porte",
  1: "Pré-admission",
  2: "Synthèse 4 voix",
  3: "Mauvais prompts",
  4: "5 destinataires",
  5: "Notre projet",
};

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

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    // Fetch teams
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, code, password, animator, composition")
      .order("code");

    if (!teamsData) return;

    // Fetch progress for all teams
    const { data: progressData } = await supabase
      .from("team_progress")
      .select("team_id, challenge_id, started_at, finished_at")
      .order("challenge_id", { ascending: false });

    // Fetch scores
    const { data: scoresData } = await supabase
      .from("team_scores")
      .select("team_id, score");

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
        currentChallengeTitle: currentChallenge !== null
          ? CHALLENGE_TITLES[currentChallenge] ?? `Défi ${currentChallenge}`
          : null,
        totalScore: scoreMap[t.id] ?? 0,
        progressPhase,
      };
    });

    setTeams(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    startHealthCheck();
    return onAIStatusChange(setAiStatus);
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_progress" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "team_scores" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, supabase]);

  const openDetails = useCallback(
    async (teamId: string) => {
      setSelectedTeam(teamId);
      const { data } = await supabase
        .from("submissions")
        .select("id, challenge_id, ai_provider, created_at, payload")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(20);
      setSubmissions((data as SubmissionDetail[]) ?? []);
    },
    [supabase]
  );

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-black">Dashboard — Vue projetée</h1>
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
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-8">
          <div className="bg-white border-2 border-black max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
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
              <div className="flex flex-col gap-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="border border-[#B8B8B8] p-3">
                    <div className="flex justify-between text-sm text-[#4A4A4A] mb-1">
                      <span className="font-semibold">
                        Défi {sub.challenge_id} — {CHALLENGE_TITLES[sub.challenge_id] ?? `#${sub.challenge_id}`}
                      </span>
                      <span>{new Date(sub.created_at).toLocaleTimeString("fr-FR")}</span>
                    </div>
                    <p className="text-xs text-[#B8B8B8]">
                      Provider: {sub.ai_provider}
                    </p>
                    <pre className="text-xs text-[#4A4A4A] mt-1 max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                      {JSON.stringify(sub.payload, null, 2).slice(0, 500)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
