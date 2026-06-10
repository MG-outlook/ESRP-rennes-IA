"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import PredictionWidget from "@/components/shared/PredictionWidget";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import Skeleton from "@/components/shared/Skeleton";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  DEFI3_BIAS_CATEGORIES,
  DEFI3_CASES,
  DEFI3_REWRITE_PROMPT,
  DEFI3_BONUS,
} from "@/lib/ai/prompts";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

const CHALLENGE_ID = 3;

interface CaseResult {
  selectedBiases: string[];
  rewrittenPrompt: string;
  rewriteOutput: string;
}

type Phase = "case" | "reveal" | "rewrite" | "results";

const BIAS_LABELS: Record<string, string> = Object.fromEntries(
  DEFI3_BIAS_CATEGORIES.map((b) => [b.id, b.label])
);

export default function Defi3Page() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [currentCase, setCurrentCase] = useState(0);
  const [phase, setPhase] = useState<Phase>("case");
  const [cachedResponses, setCachedResponses] = useState<Record<string, string>>({});

  // Per-case state
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [selectedBiases, setSelectedBiases] = useState<string[]>([]);
  const [rewrittenPrompt, setRewrittenPrompt] = useState("");
  const [rewriteOutput, setRewriteOutput] = useState("");
  const [rewriting, setRewriting] = useState(false);

  const [caseResults, setCaseResults] = useState<CaseResult[]>([]);
  const [bonusAnswer, setBonusAnswer] = useState<string | null>(null);
  const [bonusRevealed, setBonusRevealed] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const { show: showToast } = useToast();

  // Auto-save progress
  useAutoSave(
    `c3-progress:${teamId ?? ""}`,
    phase === "results" ? null : { currentCase, selectedBiases, rewrittenPrompt }
  );

  const { restored: restoredProgress, clear: clearSavedProgress } =
    useAutoSaveRestore<{ currentCase: number; selectedBiases: string[]; rewrittenPrompt: string }>(
      `c3-progress:${teamId ?? ""}`
    );

  useEffect(() => {
    if (restoredProgress) {
      setCurrentCase(restoredProgress.currentCase);
      setSelectedBiases(restoredProgress.selectedBiases);
      setRewrittenPrompt(restoredProgress.rewrittenPrompt);
      showToast("Brouillon restaure", "info");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
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

      // Load cached responses
      const keys = DEFI3_CASES.map((c) => c.cache_key);
      const { data: cached } = await supabase
        .from("ai_cache")
        .select("cache_key, response")
        .in("cache_key", keys)
        .eq("pre_validated", true);

      if (cached) {
        const map: Record<string, string> = {};
        for (const row of cached) {
          map[row.cache_key] =
            typeof row.response === "string"
              ? row.response
              : JSON.stringify(row.response);
        }
        setCachedResponses(map);
      }
    }
    init();
  }, []);

  const currentCaseData = DEFI3_CASES[currentCase];
  const cachedResponse = cachedResponses[currentCaseData?.cache_key] ?? "";

  const handleLockPrediction = useCallback((value: unknown) => {
    setSelectedBiases(value as string[]);
    setPredictionLocked(true);
    setPhase("reveal");
  }, []);

  const handleRewrite = useCallback(async () => {
    if (!teamId || rewriting || !rewrittenPrompt.trim()) return;
    setRewriting(true);
    setRewriteOutput("");

    await streamFromProxy({
      systemPrompt: DEFI3_REWRITE_PROMPT,
      messages: [{ role: "user", content: rewrittenPrompt }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setRewriteOutput((p) => p + t),
      onDone: () => setRewriting(false),
      onError: () => setRewriting(false),
    });
  }, [teamId, rewriting, rewrittenPrompt]);

  const handleNextCase = useCallback(() => {
    // Save current case result
    setCaseResults((prev) => [
      ...prev,
      { selectedBiases, rewrittenPrompt, rewriteOutput },
    ]);

    if (currentCase < DEFI3_CASES.length - 1) {
      setCurrentCase((c) => c + 1);
      setPhase("case");
      setPredictionLocked(false);
      setSelectedBiases([]);
      setRewrittenPrompt("");
      setRewriteOutput("");
    } else {
      setPhase("results");
    }
  }, [currentCase, selectedBiases, rewrittenPrompt, rewriteOutput]);

  const computeScore = useCallback(() => {
    let total = 0;
    const allResults = [...caseResults];
    // Include current case if in results phase
    if (phase === "results" && allResults.length === DEFI3_CASES.length) {
      // already saved
    }

    for (let i = 0; i < allResults.length; i++) {
      const expected = new Set<string>(DEFI3_CASES[i].expected_biases);
      const selected = new Set<string>(allResults[i].selectedBiases);
      for (const b of selected) {
        if (expected.has(b)) total += 2;
        else total -= 1;
      }
      // Bonus for identifying all expected biases
      for (const b of expected) {
        if (!selected.has(b)) total -= 1;
      }
    }
    return Math.max(0, total);
  }, [caseResults, phase]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    const score = computeScore();

    await supabase.from("predictions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      predicted: { biases: caseResults.map((r) => r.selectedBiases) },
      actual: { biases: DEFI3_CASES.map((c) => c.expected_biases) },
      accuracy: score,
    });

    const bonusCorrect = bonusAnswer === DEFI3_BONUS.correctId;
    const points = Math.max(0, Math.min(20, score + (bonusCorrect ? 2 : 0)));
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: {
        case_results: caseResults,
        score,
        bonus_answer: bonusAnswer,
        bonus_correct: bonusCorrect,
        points,
      },
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
    clearSavedProgress();
  }, [teamId, submitState, caseResults, bonusAnswer, computeScore, showToast, clearSavedProgress]);

  const biasOptions = DEFI3_BIAS_CATEGORIES.map((b) => b.id);

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
              Défi 3 — La Chasse aux mauvais prompts
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Identifiez les biais dans les réponses IA, puis réécrivez le prompt
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={1200} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <FadeTransition phaseKey={phase === "results" ? "results" : `case-${currentCase}`}>
        {/* Progress */}
        {phase !== "results" && (
          <div className="flex gap-2 mb-6">
            {DEFI3_CASES.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 ${
                  i < currentCase
                    ? "bg-[#2D5A3D]"
                    : i === currentCase
                      ? "bg-[#5B8C6B]"
                      : "bg-[#B8B8B8]"
                }`}
              />
            ))}
          </div>
        )}

        {/* Current case */}
        {phase !== "results" && currentCaseData && (
          <>
            <section className="mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">
                {currentCaseData.title}
              </h2>
              <div className="border-2 border-[#8B3A3A] p-4 mb-4 bg-[#F5F5F5]">
                <p className="text-sm text-[#8B3A3A] font-bold mb-1">
                  Le mauvais prompt :
                </p>
                <p className="text-black italic">
                  &quot;{currentCaseData.bad_prompt}&quot;
                </p>
              </div>
              <div className="border-2 border-black p-6">
                <h3 className="font-bold text-black mb-2">
                  Réponse de l&apos;IA :
                </h3>
                <p className="text-black whitespace-pre-wrap leading-relaxed">
                  {cachedResponse || (
                    <span className="flex flex-col gap-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-3/4" />
                    </span>
                  )}
                </p>
              </div>
            </section>

            {/* Bias identification */}
            {phase === "case" && (
              <section className="mb-6">
                <h2 className="text-2xl font-bold text-black mb-2">
                  Quels biais repérez-vous ?
                </h2>
                <div className="mb-2">
                  {DEFI3_BIAS_CATEGORIES.map((b) => (
                    <span key={b.id} className="text-sm text-[#4A4A4A] mr-4">
                      <strong>{b.label}</strong> : {b.desc}
                    </span>
                  ))}
                </div>
                <PredictionWidget
                  schema={{
                    field: "biases",
                    type: "multiselect",
                    options: biasOptions,
                  }}
                  onSubmit={handleLockPrediction}
                  locked={predictionLocked}
                />
              </section>
            )}

            {/* Reveal — the answer + explanation on the bias */}
            {phase === "reveal" && (
              <section className="mb-6">
                <h2 className="text-2xl font-bold text-black mb-4">
                  La réponse : les biais de ce prompt
                </h2>
                <div className="border-2 border-[#2D5A3D] p-5 mb-4 bg-[#F5F5F5]">
                  <p className="text-sm text-[#4A4A4A] mb-2 font-semibold uppercase tracking-wide">
                    Biais réellement présents
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentCaseData.expected_biases.map((b) => (
                      <span
                        key={b}
                        className="text-sm px-3 py-1 border-2 border-[#2D5A3D] text-[#2D5A3D] font-semibold"
                      >
                        {BIAS_LABELS[b] ?? b.replace(/_/g, " ")}
                        {selectedBiases.includes(b) ? " ✓" : ""}
                      </span>
                    ))}
                  </div>
                  <p className="text-black leading-relaxed">
                    {currentCaseData.explanation}
                  </p>
                </div>

                {/* Feedback on the team's guess */}
                <div className="mb-4">
                  <p className="text-sm text-[#4A4A4A]">
                    Votre pari :{" "}
                    {selectedBiases.length === 0 ? (
                      <em>aucun biais sélectionné</em>
                    ) : (
                      selectedBiases.map((b) => (
                        <span
                          key={b}
                          className={`text-sm px-2 py-0.5 border mr-1 ${
                            currentCaseData.expected_biases.includes(b)
                              ? "border-[#2D5A3D] text-[#2D5A3D]"
                              : "border-[#8B3A3A] text-[#8B3A3A]"
                          }`}
                        >
                          {BIAS_LABELS[b] ?? b.replace(/_/g, " ")}
                        </span>
                      ))
                    )}
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setPhase("rewrite")}
                    className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D]"
                  >
                    Réécrire le prompt
                  </button>
                </div>
              </section>
            )}

            {/* Rewrite phase */}
            {phase === "rewrite" && (
              <section className="mb-6">
                <h2 className="text-2xl font-bold text-black mb-2">
                  Réécrivez le prompt
                </h2>
                <p className="text-[#4A4A4A] mb-4">
                  Corrigez le prompt pour éliminer les biais identifiés.
                </p>
                <textarea
                  value={rewrittenPrompt}
                  onChange={(e) => setRewrittenPrompt(e.target.value)}
                  placeholder="Votre prompt amélioré..."
                  rows={4}
                  className="w-full border-2 border-black p-4 text-black bg-white focus:border-[#2D5A3D] focus:outline-none mb-4"
                />
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={handleRewrite}
                    disabled={rewriting || !rewrittenPrompt.trim()}
                    className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
                  >
                    {rewriting ? "Génération..." : "Tester le nouveau prompt"}
                  </button>
                </div>

                {(rewriteOutput || rewriting) && (
                  <StreamedOutput content={rewriteOutput} loading={rewriting} />
                )}

                {rewriteOutput && !rewriting && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={handleNextCase}
                      className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D]"
                    >
                      {currentCase < DEFI3_CASES.length - 1
                        ? "Cas suivant"
                        : "Voir les résultats"}
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Results */}
        {phase === "results" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Résultats</h2>
            <div className="border-2 border-black p-6 mb-6">
              <p className="text-4xl font-bold text-[#2D5A3D] mb-2">
                Score : {computeScore()} points
              </p>
              <p className="text-[#4A4A4A]">
                +2 par biais correctement identifié, -1 par biais manqué ou faux positif
              </p>
            </div>

            {caseResults.map((result, i) => (
              <div key={i} className="border-2 border-[#B8B8B8] p-4 mb-3">
                <h3 className="font-bold text-black">{DEFI3_CASES[i].title}</h3>
                <div className="flex gap-2 mt-2">
                  <span className="text-sm text-[#4A4A4A]">Vos choix :</span>
                  {result.selectedBiases.map((b) => (
                    <span
                      key={b}
                      className={`text-sm px-2 py-0.5 border ${
                        (DEFI3_CASES[i].expected_biases as readonly string[]).includes(b)
                          ? "border-[#2D5A3D] text-[#2D5A3D]"
                          : "border-[#8B3A3A] text-[#8B3A3A]"
                      }`}
                    >
                      {b.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-sm text-[#4A4A4A]">Attendus :</span>
                  {DEFI3_CASES[i].expected_biases.map((b) => (
                    <span
                      key={b}
                      className="text-sm px-2 py-0.5 border border-[#2D5A3D] text-[#2D5A3D]"
                    >
                      {b.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Bonus question */}
            <div className="border-2 border-[#2D5A3D] p-6 mt-8 mb-6">
              <p className="text-xs font-bold text-[#2D5A3D] uppercase tracking-widest mb-2">
                Question bonus
              </p>
              <h3 className="text-xl font-bold text-black mb-4">
                {DEFI3_BONUS.question}
              </h3>
              <div className="flex flex-col gap-2">
                {DEFI3_BONUS.options.map((opt) => {
                  const selected = bonusAnswer === opt.id;
                  const isCorrect = opt.id === DEFI3_BONUS.correctId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !bonusRevealed && setBonusAnswer(opt.id)}
                      disabled={bonusRevealed}
                      className={`text-left px-4 py-3 border-2 font-medium ${
                        bonusRevealed && isCorrect
                          ? "border-[#2D5A3D] bg-[#F0F5F1] text-[#2D5A3D]"
                          : bonusRevealed && selected && !isCorrect
                          ? "border-[#8B3A3A] bg-[#F8F0F0] text-[#8B3A3A]"
                          : selected
                          ? "border-[#2D5A3D] bg-[#2D5A3D] text-white"
                          : "border-black bg-white text-black"
                      } disabled:cursor-default`}
                    >
                      {bonusRevealed && isCorrect ? "✓ " : ""}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {!bonusRevealed ? (
                <button
                  onClick={() => setBonusRevealed(true)}
                  disabled={!bonusAnswer}
                  className="mt-4 px-5 py-2 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
                >
                  Valider ma réponse
                </button>
              ) : (
                <div className="mt-4 border-t-2 border-[#E0E0E0] pt-4">
                  <p className="font-bold text-black mb-1">
                    {bonusAnswer === DEFI3_BONUS.correctId
                      ? "✓ Bien vu !"
                      : "La bonne réponse était la première."}
                  </p>
                  <p className="text-[#4A4A4A] leading-relaxed">
                    {DEFI3_BONUS.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center mt-6">
              <SubmitButton
                state={submitState}
                onClick={handleSubmit}
                label="Valider et passer au défi suivant"
              />
            </div>
          </section>
        )}
        </FadeTransition>
      </div>
    </div>
  );
}
