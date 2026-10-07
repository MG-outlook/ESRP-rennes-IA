"use client";

import { useMemo, useState, useCallback } from "react";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import InstructionsButton from "@/components/shared/InstructionsButton";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import SubmitButton from "@/components/shared/SubmitButton";
import Verdict from "@/components/challenges/general/Verdict";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  GEN_C_DOCS,
  GEN_C_CATEGORY_LABELS,
  GEN_C_EVAL_PROMPT,
  type GenCCategory,
  type GeneralVerdict,
} from "@/lib/ai/general-prompts";
import {
  useChallengeInit,
  finishChallenge,
  parseJsonObject,
} from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 203;
const CATEGORIES = Object.keys(GEN_C_CATEGORY_LABELS) as GenCCategory[];

interface Signalement {
  quote: string;
  category: GenCCategory;
}

type Phase = "hunt" | "result";

export default function GenCPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const doc = useMemo(
    () => GEN_C_DOCS[Math.floor(Math.random() * GEN_C_DOCS.length)],
    []
  );

  const [phase, setPhase] = useState<Phase>("hunt");
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [quote, setQuote] = useState("");
  const [category, setCategory] = useState<GenCCategory>("faux");
  const [evaluating, setEvaluating] = useState(false);
  const [verdict, setVerdict] = useState<GeneralVerdict | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const addSignalement = () => {
    if (!quote.trim()) return;
    setSignalements((s) => [...s, { quote: quote.trim(), category }]);
    setQuote("");
  };

  const handleEvaluate = useCallback(async () => {
    if (!teamId || evaluating || signalements.length === 0) return;
    setEvaluating(true);
    setPhase("result");
    const listePieges = doc.pieges
      .map((p) => `- « ${p.quote} » → ${GEN_C_CATEGORY_LABELS[p.category]} (${p.why})`)
      .join("\n");
    const sig = signalements
      .map((s) => `- « ${s.quote} » → ${GEN_C_CATEGORY_LABELS[s.category]}`)
      .join("\n");
    const prompt = GEN_C_EVAL_PROMPT.replace("{LISTE_PIEGES}", listePieges).replace(
      "{SIGNALEMENTS}",
      sig
    );
    let txt = "";
    await streamFromProxy({
      systemPrompt: prompt,
      messages: [{ role: "user", content: "Évalue maintenant." }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 800,
      onChunk: (t) => {
        txt += t;
      },
      onDone: () => {
        setVerdict(parseJsonObject<GeneralVerdict>(txt));
        setEvaluating(false);
      },
      onError: () => setEvaluating(false),
    });
  }, [teamId, evaluating, signalements, doc]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      doc_id: doc.id,
      signalements,
      verdict,
      points: verdict?.total ?? null,
    });
    setSubmitState("done");
  }, [teamId, submitState, doc, signalements, verdict]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  return (
    <div className="flex-1 bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-ink">
              Défi C — La chasse à l&apos;hallu
            </h1>
            <p className="text-ink-2 mt-2">
              L&apos;IA a écrit ce document. Débusquez ses pièges.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={720} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-2xl font-bold text-ink mb-3">{doc.title}</h2>
          <div className="border p-5 bg-surface whitespace-pre-line text-ink leading-relaxed border-line">
            {doc.body}
          </div>
        </section>

        {phase === "hunt" && (
          <section className="mb-6">
            <h2 className="text-2xl font-bold text-ink mb-3">Vos signalements</h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Copiez le passage suspect…"
                className="field flex-1 px-3 py-2 "
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GenCCategory)}
                className="border px-3 py-2 text-ink border-line"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {GEN_C_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <button
                onClick={addSignalement}
                disabled={!quote.trim()}
                className="btn btn-primary px-4 py-2 disabled:opacity-50"
              >
                + Ajouter
              </button>
            </div>

            {signalements.length > 0 && (
              <ul className="flex flex-col gap-2 mb-4">
                {signalements.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 border-2 border-line p-3"
                  >
                    <span className="text-ink text-sm">
                      « {s.quote} »
                      <span className="text-brand font-semibold">
                        {" "}
                        — {GEN_C_CATEGORY_LABELS[s.category]}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        setSignalements((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-danger text-sm font-semibold shrink-0"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleEvaluate}
                disabled={signalements.length === 0}
                className="btn btn-primary px-6 py-3 text-xl disabled:opacity-50"
              >
                Soumettre la chasse ({signalements.length})
              </button>
            </div>
          </section>
        )}

        {phase === "result" && (
          <section className="mb-8">
            {evaluating && !verdict ? (
              <p className="text-center text-ink-2">Correction en cours…</p>
            ) : verdict ? (
              <Verdict verdict={verdict} />
            ) : (
              <p className="text-danger">Évaluation indisponible.</p>
            )}

            {verdict && (
              <div className="border p-4 mt-6 border-line">
                <h3 className="font-bold text-ink mb-2">Les pièges réels</h3>
                <ul className="flex flex-col gap-2">
                  {doc.pieges.map((p, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-ink">« {p.quote} » </span>
                      <span className="text-brand font-semibold">
                        — {GEN_C_CATEGORY_LABELS[p.category]}
                      </span>
                      <span className="block text-ink-2">{p.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center mt-6">
              <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
