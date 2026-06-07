"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import { streamFromProxy } from "@/lib/ai/proxy";
import { DEFI5_CADRAGE_PROMPT, DEFI5_QUESTIONS } from "@/lib/ai/prompts";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

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
  const [previousDefis, setPreviousDefis] = useState<
    { challengeId: number; title: string; summary: string }[]
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

      // Load previous challenge submissions for inspiration
      const { data: subs } = await supabase
        .from("submissions")
        .select("challenge_id, payload")
        .eq("team_id", session.team_id)
        .in("challenge_id", [1, 2, 3, 4])
        .order("challenge_id");

      const challengeTitles: Record<number, string> = {
        1: "La Pré-admission",
        2: "La Synthèse à 4 voix",
        3: "La Chasse aux mauvais prompts",
        4: "Une info, cinq destinataires",
      };

      if (subs) {
        setPreviousDefis(
          subs.map((s) => ({
            challengeId: s.challenge_id,
            title: challengeTitles[s.challenge_id] ?? `Défi ${s.challenge_id}`,
            summary:
              typeof s.payload === "object" && s.payload !== null
                ? (s.payload as Record<string, unknown>).ai_output as string ??
                  (s.payload as Record<string, unknown>).pro_output as string ??
                  "Défi complété"
                : "Défi complété",
          }))
        );
      }
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
      maxTokens: 1500,
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
          <Timer durationSec={1800} startedAt={startedAt} />
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
                    <h3 className="font-bold text-black mb-1">
                      Défi {d.challengeId} — {d.title}
                    </h3>
                    <p className="text-sm text-[#4A4A4A] line-clamp-4">
                      {d.summary.slice(0, 200)}
                      {d.summary.length > 200 ? "..." : ""}
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
              <StreamedOutput content={pactOutput} loading={generating} />
              {phase === "generation" && !generating && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleSavePact}
                    className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
                  >
                    Valider le Pacte et voter
                  </button>
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
          <section className="mb-8 text-center">
            <div className="border-2 border-[#2D5A3D] p-8">
              <p className="text-3xl font-bold text-[#2D5A3D] mb-4">
                Bravo !
              </p>
              <p className="text-xl text-[#4A4A4A]">
                Votre Pacte IA est finalisé. Il sera imprimé et remis à votre
                équipe.
              </p>
            </div>
          </section>
        )}
        </FadeTransition>
      </div>
    </div>
  );
}
