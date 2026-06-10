"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import PredictionWidget from "@/components/shared/PredictionWidget";
import SubmitButton from "@/components/shared/SubmitButton";
import FadeTransition from "@/components/shared/FadeTransition";
import Skeleton from "@/components/shared/Skeleton";
import DocumentCamille, { getDocumentContent } from "@/components/challenges/DocumentCamille";
import { streamFromProxy } from "@/lib/ai/proxy";
import { DEFI4_RECIPIENTS } from "@/lib/ai/prompts";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

const CHALLENGE_ID = 4;

type Phase = "document" | "prediction" | "generation" | "review";

interface ColumnState {
  content: string;
  generating: boolean;
  edited: string;
  regenerated: boolean;
  approved: boolean;
}

export default function Defi4Page() {
  const [phase, setPhase] = useState<Phase>("document");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [predictionValue, setPredictionValue] = useState(3);
  const [columns, setColumns] = useState<Record<string, ColumnState>>(() => {
    const init: Record<string, ColumnState> = {};
    for (const r of DEFI4_RECIPIENTS) {
      init[r.id] = { content: "", generating: false, edited: "", regenerated: false, approved: false };
    }
    return init;
  });
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");
  const [expandedColumn, setExpandedColumn] = useState<number | null>(null);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const { show: showToast } = useToast();

  // Auto-save edited instructions
  const editedInstructions = Object.fromEntries(
    DEFI4_RECIPIENTS.map((r) => [r.id, columns[r.id].edited])
  );
  useAutoSave(`c4-instructions:${teamId ?? ""}`, editedInstructions);

  const { restored: restoredInstructions, clear: clearSavedInstructions } =
    useAutoSaveRestore<Record<string, string>>(`c4-instructions:${teamId ?? ""}`);

  useEffect(() => {
    if (restoredInstructions) {
      setColumns((prev) => {
        const next = { ...prev };
        for (const [id, edited] of Object.entries(restoredInstructions)) {
          if (next[id]) {
            next[id] = { ...next[id], edited: edited ?? "" };
          }
        }
        return next;
      });
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
    }
    init();
  }, []);

  const conventionContent = getDocumentContent("convention_stage");

  const generateAll = useCallback(async () => {
    if (!teamId) return;
    setPhase("generation");

    const promises = DEFI4_RECIPIENTS.map(async (recipient) => {
      setColumns((prev) => ({
        ...prev,
        [recipient.id]: { ...prev[recipient.id], generating: true, content: "" },
      }));

      await streamFromProxy({
        systemPrompt: recipient.systemPrompt,
        messages: [
          {
            role: "user",
            content: `Voici la convention de stage de Camille Renaud :\n\n${conventionContent}\n\nRédige le courrier.`,
          },
        ],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 4000,
        onChunk: (t) =>
          setColumns((prev) => ({
            ...prev,
            [recipient.id]: {
              ...prev[recipient.id],
              content: prev[recipient.id].content + t,
            },
          })),
        onDone: () =>
          setColumns((prev) => ({
            ...prev,
            [recipient.id]: { ...prev[recipient.id], generating: false },
          })),
        onError: () =>
          setColumns((prev) => ({
            ...prev,
            [recipient.id]: { ...prev[recipient.id], generating: false },
          })),
      });
    });

    await Promise.allSettled(promises);
    setPhase("review");
  }, [teamId, conventionContent]);

  const handleLockPrediction = useCallback(
    (value: unknown) => {
      setPredictionValue(value as number);
      setPredictionLocked(true);
      showToast("Prediction verrouillee", "success");
      generateAll();
    },
    [generateAll]
  );

  const handleRegenerate = useCallback(
    async (recipientId: string) => {
      if (!teamId) return;
      const recipient = DEFI4_RECIPIENTS.find((r) => r.id === recipientId);
      if (!recipient || columnsRef.current[recipientId].regenerated) return;

      setColumns((prev) => ({
        ...prev,
        [recipientId]: { ...prev[recipientId], content: "", generating: true, regenerated: true },
      }));

      const editedPrompt = columnsRef.current[recipientId].edited.trim();
      const userContent = editedPrompt
        ? `Voici la convention de stage de Camille Renaud :\n\n${conventionContent}\n\nInstruction supplémentaire de l'équipe : ${editedPrompt}\n\nRédige le courrier.`
        : `Voici la convention de stage de Camille Renaud :\n\n${conventionContent}\n\nRédige le courrier.`;

      await streamFromProxy({
        systemPrompt: recipient.systemPrompt,
        messages: [{ role: "user", content: userContent }],
        challengeId: CHALLENGE_ID,
        teamId,
        maxTokens: 4000,
        onChunk: (t) =>
          setColumns((prev) => ({
            ...prev,
            [recipientId]: { ...prev[recipientId], content: prev[recipientId].content + t },
          })),
        onDone: () =>
          setColumns((prev) => ({
            ...prev,
            [recipientId]: { ...prev[recipientId], generating: false },
          })),
        onError: () =>
          setColumns((prev) => ({
            ...prev,
            [recipientId]: { ...prev[recipientId], generating: false },
          })),
      });
    },
    [teamId, conventionContent]
  );

  const toggleApprove = useCallback((id: string) => {
    setColumns((prev) => ({
      ...prev,
      [id]: { ...prev[id], approved: !prev[id].approved },
    }));
  }, []);

  const approvedCount = Object.values(columns).filter((c) => c.approved).length;
  const allDone = Object.values(columns).every((c) => !c.generating);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    await supabase.from("predictions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      predicted: { usable_without_edit: predictionValue },
      actual: { usable_without_edit: approvedCount },
      accuracy: Math.abs(predictionValue - approvedCount),
    });

    const payload: Record<string, { content: string; approved: boolean; regenerated: boolean }> = {};
    for (const r of DEFI4_RECIPIENTS) {
      payload[r.id] = {
        content: columns[r.id].content,
        approved: columns[r.id].approved,
        regenerated: columns[r.id].regenerated,
      };
    }

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload,
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
    clearSavedInstructions();
  }, [teamId, submitState, predictionValue, approvedCount, columns, showToast, clearSavedInstructions]);

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
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              Défi 4 — Une info, cinq destinataires
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              L&apos;IA adapte un même document pour 5 interlocuteurs différents
            </p>
          </div>
          <Timer durationSec={1500} startedAt={startedAt} />
        </div>

        {/* Source document */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">Document source</h2>
          <DocumentCamille kind="convention_stage" />
        </section>

        <FadeTransition phaseKey={phase}>
        {/* Prediction */}
        {phase === "document" && (
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setPhase("prediction")}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl"
            >
              J&apos;ai lu — Faire mon pari
            </button>
          </div>
        )}

        {phase === "prediction" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Votre pari : combien de versions seront utilisables telles quelles ?
            </h2>
            <PredictionWidget
              schema={{ field: "usable_without_edit", min: 0, max: 5 }}
              onSubmit={handleLockPrediction}
              locked={predictionLocked}
            />
          </section>
        )}

        {/* 5 columns */}
        {(phase === "generation" || phase === "review") && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Les 5 versions générées
            </h2>
            {/* Tablet: accordion (shown below lg) */}
            <div className="lg:hidden flex flex-col gap-2">
              {DEFI4_RECIPIENTS.map((r, i) => {
                const col = columns[r.id];
                return (
                  <div key={r.id} className="border-2 border-black">
                    <button
                      onClick={() => setExpandedColumn(expandedColumn === i ? null : i)}
                      className="w-full p-4 min-h-[44px] text-left font-bold text-black flex justify-between items-center"
                      aria-expanded={expandedColumn === i}
                    >
                      <span>{r.label}</span>
                      <span className="text-[#4A4A4A]">{expandedColumn === i ? "\u2212" : "+"}</span>
                    </button>
                    {expandedColumn === i && (
                      <div className="p-4 border-t-2 border-black">
                        {col.content ? (
                          <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">{col.content}</p>
                        ) : col.generating ? (
                          <div className="flex flex-col gap-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                          </div>
                        ) : (
                          <span className="text-[#B8B8B8] text-sm">En attente</span>
                        )}
                        {phase === "review" && allDone && !col.regenerated && (
                          <div className="flex flex-col gap-2 mt-3">
                            <input
                              type="text"
                              placeholder="Instruction d'ajustement..."
                              value={col.edited}
                              onChange={(e) =>
                                setColumns((prev) => ({
                                  ...prev,
                                  [r.id]: { ...prev[r.id], edited: e.target.value },
                                }))
                              }
                              className="border-2 border-black px-2 py-1 text-sm focus:border-[#2D5A3D] focus:outline-none"
                            />
                            <button
                              onClick={() => handleRegenerate(r.id)}
                              className="px-3 py-1 text-sm border-2 border-black text-black font-semibold"
                            >
                              Régénérer
                            </button>
                          </div>
                        )}
                        {phase === "review" && allDone && (
                          <button
                            onClick={() => toggleApprove(r.id)}
                            className={`mt-2 px-3 py-2 text-sm font-semibold border-2 ${
                              col.approved
                                ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                                : "bg-white border-black text-black"
                            }`}
                          >
                            {col.approved ? "Approuvé" : "Approuver"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Desktop: horizontal layout */}
            <div className="hidden lg:flex gap-4 overflow-x-auto pb-4">
              {DEFI4_RECIPIENTS.map((r) => {
                const col = columns[r.id];
                return (
                  <div
                    key={r.id}
                    className={`min-w-[280px] flex-1 border-2 p-4 flex flex-col ${
                      col.approved ? "border-[#2D5A3D]" : "border-black"
                    }`}
                  >
                    <h3 className="font-bold text-black mb-2">{r.label}</h3>
                    <div className="flex-1 overflow-y-auto max-h-[400px] mb-3">
                      {col.content ? (
                        <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                          {col.content}
                        </p>
                      ) : col.generating ? (
                        <div className="flex flex-col gap-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : (
                        <span className="text-[#B8B8B8] text-sm">En attente</span>
                      )}
                    </div>

                    {phase === "review" && allDone && (
                      <div className="flex flex-col gap-2 mt-auto">
                        {!col.regenerated && (
                          <>
                            <input
                              type="text"
                              placeholder="Instruction d'ajustement..."
                              value={col.edited}
                              onChange={(e) =>
                                setColumns((prev) => ({
                                  ...prev,
                                  [r.id]: { ...prev[r.id], edited: e.target.value },
                                }))
                              }
                              className="border-2 border-black px-2 py-1 text-sm focus:border-[#2D5A3D] focus:outline-none"
                            />
                            <button
                              onClick={() => handleRegenerate(r.id)}
                              className="px-3 py-1 text-sm border-2 border-black text-black font-semibold"
                            >
                              Régénérer
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => toggleApprove(r.id)}
                          className={`px-3 py-2 text-sm font-semibold border-2 ${
                            col.approved
                              ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                              : "bg-white border-black text-black"
                          }`}
                        >
                          {col.approved ? "Approuvé" : "Approuver"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Score + submit */}
        {phase === "review" && allDone && (
          <section className="mb-8">
            <div className="border-2 border-black p-6 mb-4 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-black">
                  {approvedCount}/5 versions approuvées
                </span>
                <span className="text-[#4A4A4A] ml-4">
                  (votre pari : {predictionValue}/5)
                </span>
              </div>
            </div>
            <div className="flex justify-center">
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
