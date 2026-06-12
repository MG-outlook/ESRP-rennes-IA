"use client";

import { useState, useCallback } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Markdown from "@/components/shared/Markdown";
import SubmitButton from "@/components/shared/SubmitButton";
import Verdict from "@/components/challenges/general/Verdict";
import VoiceInput from "@/components/shared/VoiceInput";
import DossierAppui from "@/components/challenges/DossierAppui";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  UC3_CONTEXTE,
  UC3_VECUS,
  UC3_COMPILE_PROMPT,
  UC3_JUDGE_PROMPT,
} from "@/lib/ai/usecase-prompts";
import type { GeneralVerdict } from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
} from "@/lib/challenges/general-helpers";
import { parseJsonObject } from "@/lib/challenges/general-pure";

const CHALLENGE_ID = 303;
const MIN_NOTES = 2;

interface Note {
  author: string;
  role: string;
  text: string;
}

interface Action {
  action: string;
  responsable: string;
  echeance: string;
}

type Phase = "notes" | "compiled" | "result";

/** Sépare l'analyse Markdown du bloc « ACTIONS: [...] » final. */
function splitCompilation(raw: string): { analysis: string; actions: Action[] } {
  const analysis = raw.replace(/ACTIONS\s*:[\s\S]*$/, "").trim();
  const m = raw.match(/ACTIONS\s*:\s*(\[[\s\S]*\])/);
  if (!m) return { analysis, actions: [] };
  try {
    const parsed = JSON.parse(m[1]) as Action[];
    return {
      analysis,
      actions: parsed.filter((a) => a && typeof a.action === "string"),
    };
  } catch {
    return { analysis, actions: [] };
  }
}

export default function Uc3Page() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const [author, setAuthor] = useState("");
  const [role, setRole] = useState(UC3_VECUS[0].role);
  const [text, setText] = useState("");
  const [streamText, setStreamText] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [actions, setActions] = useState<Action[]>([]);
  const [kept, setKept] = useState<Record<number, boolean>>({});
  const [compiling, setCompiling] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const handleAddNote = useCallback(() => {
    if (!author.trim() || !text.trim()) return;
    setNotes((prev) => [...prev, { author: author.trim(), role, text: text.trim() }]);
    setAuthor("");
    setText("");
  }, [author, role, text]);

  const notesBlock = useCallback(
    () =>
      notes
        .map((n) => `Note de ${n.author} (${n.role}) :\n${n.text}`)
        .join("\n\n"),
    [notes]
  );

  const handleCompile = useCallback(async () => {
    if (!teamId || compiling || notes.length < MIN_NOTES) return;
    setCompiling(true);
    setStreamText("");
    setPhase("compiled");

    let txt = "";
    await streamFromProxy({
      systemPrompt: UC3_COMPILE_PROMPT,
      messages: [{ role: "user", content: `Contexte : ${UC3_CONTEXTE}\n\n${notesBlock()}` }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 2500,
      onChunk: (t) => {
        txt += t;
        setStreamText(txt.replace(/ACTIONS\s*:[\s\S]*$/, ""));
      },
      onDone: () => {
        const { analysis: a, actions: acts } = splitCompilation(txt);
        setAnalysis(a);
        setActions(acts);
        setKept({});
        setCompiling(false);
      },
      onError: () => setCompiling(false),
    });
  }, [teamId, compiling, notes.length, notesBlock]);

  const keptActions = actions.filter((_, i) => kept[i]);

  const handleEvaluate = useCallback(async () => {
    if (!teamId || evaluating || keptActions.length === 0) return;
    setEvaluating(true);
    setPhase("result");
    const prompt = UC3_JUDGE_PROMPT.replace("{NOTES}", notesBlock())
      .replace("{PROPOSEES}", JSON.stringify(actions))
      .replace("{RETENUES}", JSON.stringify(keptActions));
    let txt = "";
    await streamFromProxy({
      systemPrompt: prompt,
      messages: [{ role: "user", content: "Évalue maintenant." }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 600,
      onChunk: (t) => {
        txt += t;
      },
      onDone: () => {
        const raw = parseJsonObject<{
          coherence: number;
          realisme: number;
          discernement: number;
          point_fort?: string;
          a_ameliorer?: string;
          conseil?: string;
        }>(txt);
        const coh = Math.max(0, Math.min(8, raw?.coherence ?? 0));
        const rea = Math.max(0, Math.min(6, raw?.realisme ?? 0));
        const dis = Math.max(0, Math.min(6, raw?.discernement ?? 0));
        setVerdict({
          total: coh + rea + dis,
          details: [
            { label: "Cohérence avec les notes", score: coh, max: 8 },
            { label: "Réalisme", score: rea, max: 6 },
            { label: "Discernement", score: dis, max: 6 },
          ],
          point_fort: raw?.point_fort,
          a_ameliorer: raw?.a_ameliorer,
          conseil: raw?.conseil,
        });
        setEvaluating(false);
      },
      onError: () => setEvaluating(false),
    });
  }, [teamId, evaluating, keptActions, actions, notesBlock]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      notes,
      analysis,
      proposedActions: actions,
      keptActions,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, notes, analysis, actions, keptActions, verdict]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-black">
              Cas d&apos;usage 3 — Le débrief vocal
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Chacun dicte sa note. L&apos;IA compile. Vous décidez.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={1200} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <DossierAppui
          intro={UC3_CONTEXTE}
          extras={UC3_VECUS.map((v) => ({
            title: `Vécu — ${v.role}`,
            content: v.vecu,
          }))}
          defaultOpen={phase === "notes"}
        />

        {phase === "notes" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Vos notes de débrief ({notes.length})
            </h2>
            <p className="text-[#4A4A4A] mb-4">
              Chaque membre choisit un métier, lit sa fiche de vécu (dossier
              d&apos;appui ci-dessus), puis <strong>dicte sa note avec ses
              mots</strong> — comme un message vocal laissé à l&apos;équipe.
              Au moins {MIN_NOTES} notes pour compiler.
            </p>

            {notes.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                {notes.map((n, i) => (
                  <div key={i} className="border-2 border-black p-3">
                    <p className="text-sm font-bold text-[#2D5A3D] mb-1">
                      {n.author} — {n.role}
                    </p>
                    <p className="text-sm text-[#4A4A4A] whitespace-pre-wrap">{n.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-2 border-[#2D5A3D] p-4">
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Prénom"
                  className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none sm:w-44"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none bg-white flex-1"
                >
                  {UC3_VECUS.map((v) => (
                    <option key={v.role} value={v.role}>
                      {v.role}
                    </option>
                  ))}
                </select>
              </div>
              <VoiceInput
                value={text}
                onChange={setText}
                rows={4}
                placeholder="Dictez ou tapez votre note de débrief de la semaine…"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAddNote}
                  disabled={!author.trim() || !text.trim()}
                  className="px-5 py-2 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
                >
                  + Ajouter ma note
                </button>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <button
                onClick={handleCompile}
                disabled={notes.length < MIN_NOTES}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
              >
                Compiler les {notes.length} notes
              </button>
            </div>
          </section>
        )}

        {(phase === "compiled" || phase === "result") && (
          <>
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-3">
                L&apos;analyse de l&apos;IA
              </h2>
              {compiling ? (
                <div className="border-2 border-black p-5">
                  {streamText ? (
                    <Markdown content={streamText} />
                  ) : (
                    <span className="text-[#B8B8B8] animate-pulse">
                      Compilation des notes…
                    </span>
                  )}
                </div>
              ) : (
                <div className="border-2 border-black p-5">
                  <Markdown content={analysis} />
                </div>
              )}
            </section>

            {!compiling && actions.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-2">
                  Le plan d&apos;action proposé — à vous de trancher
                </h2>
                <p className="text-[#4A4A4A] mb-4">
                  L&apos;IA propose, l&apos;équipe dispose : cochez les actions
                  que vous retenez réellement pour lundi. Écarter une action
                  inutile vaut autant que garder une bonne.
                </p>
                <div className="flex flex-col gap-2">
                  {actions.map((a, i) => (
                    <label
                      key={i}
                      className={`flex items-start gap-3 border-2 p-3 cursor-pointer ${
                        kept[i] ? "border-[#2D5A3D] bg-[#F0F5F1]" : "border-black"
                      } ${phase === "result" ? "pointer-events-none" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!kept[i]}
                        onChange={(e) =>
                          setKept((prev) => ({ ...prev, [i]: e.target.checked }))
                        }
                        disabled={phase === "result"}
                        className="w-5 h-5 mt-0.5 accent-[#2D5A3D] shrink-0"
                      />
                      <span>
                        <span className="block font-semibold text-black">
                          {a.action}
                        </span>
                        <span className="block text-sm text-[#4A4A4A]">
                          {a.responsable} · {a.echeance}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {phase === "compiled" && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleEvaluate}
                      disabled={keptActions.length === 0}
                      className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
                    >
                      Valider notre plan ({keptActions.length} action
                      {keptActions.length > 1 ? "s" : ""})
                    </button>
                  </div>
                )}
              </section>
            )}

            {!compiling && actions.length === 0 && phase === "compiled" && (
              <p className="text-[#8B3A3A] mb-6">
                L&apos;IA n&apos;a pas renvoyé d&apos;actions exploitables —
                relancez la compilation.
                <button
                  onClick={handleCompile}
                  className="ml-3 underline text-[#2D5A3D] font-semibold"
                >
                  Relancer
                </button>
              </p>
            )}

            {phase === "result" && (
              <section className="mb-8">
                {evaluating && !verdict ? (
                  <p className="text-center text-[#4A4A4A]">Évaluation en cours…</p>
                ) : verdict ? (
                  <Verdict verdict={verdict} />
                ) : null}
                {verdict && (
                  <div className="flex justify-center mt-6">
                    <SubmitButton
                      state={submitState}
                      onClick={handleSubmit}
                      label="Valider"
                    />
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
