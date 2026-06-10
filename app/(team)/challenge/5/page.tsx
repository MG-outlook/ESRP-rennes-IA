"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import Markdown from "@/components/shared/Markdown";
import { streamFromProxy } from "@/lib/ai/proxy";
import { DEFI5_CADRAGE_PROMPT, DEFI5_QUESTIONS } from "@/lib/ai/prompts";
import { challengeTitle, computeChallengeScore, formatDuration } from "@/lib/scoring";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CHALLENGE_ID = 5;
const VOTE_CATEGORIES = ["inspirant", "realiste", "universel"] as const;

type Phase = "inspiration" | "cadrage" | "generation" | "vote" | "finalized";

interface OtherProject {
  teamId: string;
  teamCode: string;
  description: string;
}

export default function Defi5Page() {
  const [phase, setPhase] = useState<Phase>("inspiration");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(Array(5).fill(""));
  const [pactOutput, setPactOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [otherProjects, setOtherProjects] = useState<OtherProject[]>([]);
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");
  const [teamCode, setTeamCode] = useState<string>("");
  const [previousDefis, setPreviousDefis] = useState<
    {
      challengeId: number;
      title: string;
      summary: string;
      points: number | null;
      duration: string | null;
    }[]
  >([]);

  const { show: showToast } = useToast();

  // Auto-save pact answers
  useAutoSave(`c5-pact-answers:${teamId ?? ""}`, answers);

  const { restored: restoredAnswers, clear: clearSavedAnswers } =
    useAutoSaveRestore<string[]>(`c5-pact-answers:${teamId ?? ""}`);

  useEffect(() => {
    if (restoredAnswers) {
      setAnswers(restoredAnswers);
      showToast("Brouillon restaure", "info");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: session } = await supabase
        .from("team_sessions")
        .select("team_id")
        .eq("auth_uid", user.id)
        .single();
      if (!session) return;
      setTeamId(session.team_id);

      const { data: progress } = await supabase
        .from("team_progress")
        .select("started_at")
        .eq("team_id", session.team_id)
        .eq("challenge_id", CHALLENGE_ID)
        .single();
      if (progress?.started_at) {
        setStartedAt(progress.started_at);
      } else {
        const now = new Date().toISOString();
        await supabase.from("team_progress").upsert({
          team_id: session.team_id,
          challenge_id: CHALLENGE_ID,
          started_at: now,
        });
        setStartedAt(now);
      }

      // Team code (for retrieving the final document later)
      const { data: team } = await supabase
        .from("teams")
        .select("code")
        .eq("id", session.team_id)
        .single();
      if (team?.code) setTeamCode(team.code);

      // Load previous challenges: latest submission (points + summary) and the
      // time the team took (from team_progress).
      const [{ data: subs }, { data: prog }] = await Promise.all([
        supabase
          .from("submissions")
          .select("challenge_id, payload, created_at")
          .eq("team_id", session.team_id)
          .in("challenge_id", [1, 2, 3, 4])
          .order("created_at", { ascending: false }),
        supabase
          .from("team_progress")
          .select("challenge_id, started_at, finished_at")
          .eq("team_id", session.team_id)
          .in("challenge_id", [1, 2, 3, 4]),
      ]);

      const durationByChallenge: Record<number, string | null> = {};
      for (const p of prog ?? []) {
        durationByChallenge[p.challenge_id] = formatDuration(
          p.started_at,
          p.finished_at
        );
      }

      // Keep only the latest submission per challenge.
      const seen = new Set<number>();
      const recap: typeof previousDefis = [];
      for (const s of subs ?? []) {
        if (seen.has(s.challenge_id)) continue;
        seen.add(s.challenge_id);
        const payload = s.payload as Record<string, unknown> | null;
        const summary =
          (payload?.ai_output as string) ??
          (payload?.pro_output as string) ??
          (payload?.output as string) ??
          "Défi complété";
        recap.push({
          challengeId: s.challenge_id,
          title: challengeTitle(s.challenge_id),
          summary,
          points: computeChallengeScore(s.challenge_id, payload),
          duration: durationByChallenge[s.challenge_id] ?? null,
        });
      }
      recap.sort((a, b) => a.challengeId - b.challengeId);
      setPreviousDefis(recap);
    }
    init();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating) return;
    setGenerating(true);
    setPactOutput("");

    const userMsg = DEFI5_QUESTIONS.map(
      (q, i) => `Q${i + 1} : ${q}\nR${i + 1} : ${answers[i]}`
    ).join("\n\n");

    await streamFromProxy({
      systemPrompt: DEFI5_CADRAGE_PROMPT,
      messages: [{ role: "user", content: userMsg }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setPactOutput((p) => p + t),
      onDone: () => {
        setGenerating(false);
        setPhase("generation");
      },
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, answers]);

  const handleSavePact = useCallback(async () => {
    if (!teamId) return;
    const supabase = createClient();

    await supabase.from("pacts").upsert({
      team_id: teamId,
      porteur: answers[3],
      besoin: answers[1],
      indicateur: answers[4],
      description: pactOutput,
      finalized_at: new Date().toISOString(),
    });

    // Load other projects for voting
    const { data: otherPacts } = await supabase
      .from("pacts")
      .select("team_id, description")
      .neq("team_id", teamId)
      .not("description", "is", null);

    if (otherPacts && otherPacts.length > 0) {
      // Get team codes
      const teamIds = otherPacts.map((p) => p.team_id);
      const { data: teams } = await supabase
        .from("teams")
        .select("id, code")
        .in("id", teamIds);

      const codeMap: Record<string, string> = {};
      if (teams) {
        for (const t of teams) codeMap[t.id] = t.code;
      }

      setOtherProjects(
        otherPacts.map((p) => ({
          teamId: p.team_id,
          teamCode: codeMap[p.team_id] ?? "???",
          description: p.description ?? "",
        }))
      );
    }

    setPhase("vote");
  }, [teamId, answers, pactOutput]);

  const handleVote = useCallback(
    (votedTeamId: string, category: string, stars: number) => {
      setVotes((prev) => ({
        ...prev,
        [votedTeamId]: { ...(prev[votedTeamId] ?? {}), [category]: stars },
      }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    // Save votes
    const voteInserts = Object.entries(votes).flatMap(([votedTeamId, cats]) =>
      Object.entries(cats).map(([category, stars]) => ({
        voter_team_id: teamId,
        voted_team_id: votedTeamId,
        vote_category: category,
        stars,
      }))
    );

    if (voteInserts.length > 0) {
      await supabase.from("votes").upsert(voteInserts, {
        onConflict: "voter_team_id,voted_team_id,vote_category",
      });
    }

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { answers, pact: pactOutput, votes },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
    showToast("Reponse enregistree", "success");
    clearSavedAnswers();
    setPhase("finalized");
  }, [teamId, submitState, votes, answers, pactOutput, showToast, clearSavedAnswers]);

  const allAnswered = answers.every((a) => a.trim().length > 0);

  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return (
      <ChallengeIntro
        {...CHALLENGE_INTROS[CHALLENGE_ID]}
        onStart={() => setIntroDone(true)}
      />
    );

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              Défi 5 — Notre projet
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Construisez votre Pacte IA collectif
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={1800} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <FadeTransition phaseKey={phase}>
        {/* Phase A — Inspiration */}
        {phase === "inspiration" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Vos défis précédents
            </h2>
            {previousDefis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {previousDefis.map((d) => (
                  <div key={d.challengeId} className="border-2 border-black p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-black">
                        Défi {d.challengeId} — {d.title}
                      </h3>
                      {d.points != null && (
                        <span className="shrink-0 text-sm font-bold text-white bg-[#2D5A3D] px-2 py-0.5">
                          {d.points}/20
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#4A4A4A] mb-2">
                      {d.duration ? `⏱ Temps : ${d.duration}` : "⏱ Temps non mesuré"}
                    </p>
                    <p className="text-sm text-[#4A4A4A] line-clamp-3">
                      {d.summary.slice(0, 180)}
                      {d.summary.length > 180 ? "…" : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#4A4A4A] mb-6">
                Aucun défi précédent trouvé. Pas d&apos;inquiétude, passez directement au cadrage.
              </p>
            )}
            <div className="flex justify-center">
              <button
                onClick={() => setPhase("cadrage")}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
              >
                Passer au cadrage
              </button>
            </div>
          </section>
        )}

        {/* Phase B — Cadrage */}
        {phase === "cadrage" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              5 questions de cadrage
            </h2>
            <div className="flex flex-col gap-6">
              {DEFI5_QUESTIONS.map((q, i) => (
                <div key={i} className="border-2 border-black p-4">
                  <label className="font-bold text-black block mb-2">
                    {i + 1}. {q}
                  </label>
                  <textarea
                    value={answers[i]}
                    onChange={(e) =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    rows={3}
                    className="w-full border-2 border-black p-3 text-black bg-white focus:border-[#2D5A3D] focus:outline-none"
                    placeholder="Votre réponse..."
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={handleGenerate}
                disabled={!allAnswered || generating}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
              >
                {generating ? "Génération du Pacte..." : "Générer notre Pacte IA"}
              </button>
            </div>
          </section>
        )}

        {/* Pact output */}
        {(phase === "generation" || phase === "vote" || phase === "finalized") &&
          pactOutput && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">
                Votre Pacte IA
              </h2>

              {/* While streaming */}
              {phase === "generation" && generating && (
                <StreamedOutput content={pactOutput} loading={generating} />
              )}

              {/* Editable once generated */}
              {phase === "generation" && !generating && (
                <>
                  <p className="text-sm text-[#4A4A4A] mb-2">
                    Relisez et <strong>modifiez librement</strong> votre Pacte avant de le valider.
                  </p>
                  <textarea
                    value={pactOutput}
                    onChange={(e) => setPactOutput(e.target.value)}
                    rows={16}
                    className="w-full border-2 border-black p-4 text-black bg-white focus:border-[#2D5A3D] focus:outline-none font-mono text-sm"
                  />
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={handleSavePact}
                      className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
                    >
                      Valider le Pacte et voter
                    </button>
                  </div>
                </>
              )}

              {/* Read-only after validation */}
              {(phase === "vote" || phase === "finalized") && (
                <div className="border-2 border-black p-6">
                  <Markdown content={pactOutput} />
                </div>
              )}
            </section>
          )}

        {/* Phase C — Vote */}
        {phase === "vote" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Votez pour les projets des autres équipes
            </h2>
            {otherProjects.length === 0 ? (
              <div className="border-2 border-[#B8B8B8] p-6 text-center">
                <p className="text-[#4A4A4A]">
                  Aucune autre équipe n&apos;a encore finalisé son projet.
                  Vous pouvez valider directement.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {otherProjects.map((proj) => (
                  <div key={proj.teamId} className="border-2 border-black p-4">
                    <h3 className="font-bold text-black mb-2">
                      Équipe {proj.teamCode}
                    </h3>
                    <p className="text-[#4A4A4A] text-sm whitespace-pre-wrap mb-4 max-h-[200px] overflow-y-auto">
                      {proj.description}
                    </p>
                    <div className="flex gap-4">
                      {VOTE_CATEGORIES.map((cat) => (
                        <div key={cat} className="flex flex-col items-center gap-1">
                          <span className="text-sm text-[#4A4A4A] capitalize">
                            {cat}
                          </span>
                          <div className="flex gap-1">
                            {[1, 2, 3].map((s) => (
                              <button
                                key={s}
                                onClick={() => handleVote(proj.teamId, cat, s)}
                                className={`w-8 h-8 border-2 text-sm font-bold ${
                                  (votes[proj.teamId]?.[cat] ?? 0) >= s
                                    ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                                    : "bg-white border-[#B8B8B8] text-[#B8B8B8]"
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center mt-6">
              <SubmitButton
                state={submitState}
                onClick={handleSubmit}
                label="Finaliser"
              />
            </div>
          </section>
        )}

        {/* Finalized */}
        {phase === "finalized" && (
          <section className="mb-8">
            <div className="border-2 border-[#2D5A3D] p-8 text-center mb-6">
              <p className="text-3xl font-bold text-[#2D5A3D] mb-3">Bravo !</p>
              <p className="text-xl text-[#4A4A4A]">
                Votre Pacte IA est finalisé et enregistré.
              </p>
              {teamCode && (
                <p className="text-[#4A4A4A] mt-3">
                  Code équipe : <strong className="text-black text-lg">{teamCode}</strong>{" "}
                  — conservez-le pour récupérer votre document.
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D]"
              >
                Exporter en PDF
              </button>
              <button
                onClick={() =>
                  downloadMarkdown(`${teamCode || "equipe"}-pacte.md`, pactOutput)
                }
                className="px-6 py-3 bg-white text-[#2D5A3D] font-semibold border-2 border-[#2D5A3D]"
              >
                Télécharger en .md
              </button>
            </div>

            {/* Printable document (isolated by print CSS) */}
            <div id="printable-pact" className="border-2 border-black p-8">
              <h1 className="text-2xl font-bold text-black mb-4">
                Pacte IA{teamCode ? ` — Équipe ${teamCode}` : ""}
              </h1>
              <Markdown content={pactOutput} />
            </div>
          </section>
        )}
        </FadeTransition>
      </div>
    </div>
  );
}
