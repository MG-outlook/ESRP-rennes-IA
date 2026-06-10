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
import {
  getDocumentContent,
  type DocumentKind,
} from "@/components/challenges/DocumentCamille";
import { streamFromProxy } from "@/lib/ai/proxy";
import {
  DEFI4_BRIEF,
  DEFI4_GENERATION_SYSTEM_PROMPT,
  DEFI4_JUDGE_SYSTEM_PROMPT,
  DEFI4_MAX_ATTEMPTS,
} from "@/lib/ai/prompts";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

const CHALLENGE_ID = 4;

type Phase = "brief" | "compose" | "verdict";

// Documents the team can choose to put in the AI's context.
const DEFI4_DOCS: { kind: DocumentKind; label: string; hint: string }[] = [
  {
    kind: "convention_stage",
    label: "Convention de stage (MISPE)",
    hint: "Entreprise, dates, encadrement, modalités du stage.",
  },
  {
    kind: "mdph_letter",
    label: "Notification MDPH",
    hint: "RQTH, référence dossier, préconisations d'aménagement.",
  },
  {
    kind: "medical_sheet",
    label: "Fiche de liaison médicale",
    hint: "Restrictions et aptitudes médicales de Camille.",
  },
  {
    kind: "motivation_letter",
    label: "Lettre de motivation de Camille",
    hint: "Son parcours et ses envies (utile ? à vous de juger).",
  },
];

interface Verdict {
  prompt_quality: number;
  documents_quality: number;
  commentaire: string;
  conseils: string[];
}

export default function Defi4Page() {
  const [phase, setPhase] = useState<Phase>("brief");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Record<DocumentKind, boolean>>({
    mdph_letter: false,
    motivation_letter: false,
    medical_sheet: false,
    convention_stage: false,
  });
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [judging, setJudging] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const { show: showToast } = useToast();

  useAutoSave(`c4-prompt:${teamId ?? ""}`, phase === "verdict" ? null : prompt);
  const { restored: restoredPrompt, clear: clearSavedPrompt } =
    useAutoSaveRestore<string>(`c4-prompt:${teamId ?? ""}`);

  useEffect(() => {
    if (restoredPrompt && !prompt) setPrompt(restoredPrompt);
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

  const selectedKinds = DEFI4_DOCS.filter((d) => selectedDocs[d.kind]).map((d) => d.kind);
  const attemptsLeft = DEFI4_MAX_ATTEMPTS - attempts;

  const toggleDoc = useCallback((kind: DocumentKind) => {
    setSelectedDocs((prev) => ({ ...prev, [kind]: !prev[kind] }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating || !prompt.trim() || attempts >= DEFI4_MAX_ATTEMPTS) return;
    setGenerating(true);
    setOutput("");

    // Inject ONLY the documents the team selected — their choice shapes the
    // AI's context in real time.
    const docsText = DEFI4_DOCS.filter((d) => selectedDocs[d.kind])
      .map((d) => `### ${d.label}\n${getDocumentContent(d.kind)}`)
      .join("\n\n");

    const systemPrompt = `${DEFI4_GENERATION_SYSTEM_PROMPT}\n\nDOCUMENTS À TA DISPOSITION :\n${
      docsText || "(aucun document fourni par l'équipe)"
    }`;

    await streamFromProxy({
      systemPrompt,
      messages: [{ role: "user", content: prompt }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setOutput((p) => p + t),
      onDone: () => {
        setGenerating(false);
        setAttempts((a) => a + 1);
      },
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, prompt, attempts, selectedDocs]);

  const handleValidate = useCallback(async () => {
    if (!teamId || judging || !output) return;
    setPhase("verdict");
    setJudging(true);
    setVerdict(null);

    const docLabels =
      DEFI4_DOCS.filter((d) => selectedDocs[d.kind]).map((d) => d.label).join(", ") ||
      "aucun";
    const judgeUser = `Documents fournis à l'IA par l'équipe : ${docLabels}.
Nombre d'essais utilisés : ${attempts}.

Prompt rédigé par l'équipe :
"""${prompt}"""

Courriers produits par l'IA :
"""${output}"""`;

    let txt = "";
    await streamFromProxy({
      systemPrompt: DEFI4_JUDGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: judgeUser }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 700,
      onChunk: (t) => { txt += t; },
      onDone: () => {
        try {
          const match = txt.match(/\{[\s\S]*\}/);
          if (match) setVerdict(JSON.parse(match[0]) as Verdict);
        } catch {
          /* parse failed — non bloquant */
        }
        setJudging(false);
      },
      onError: () => setJudging(false),
    });
  }, [teamId, judging, output, selectedDocs, attempts, prompt]);

  // Final score: prompt + documents (/20), minus 2 per extra attempt.
  const malus = Math.max(0, (attempts - 1) * 2);
  const rawScore = verdict ? verdict.prompt_quality + verdict.documents_quality : 0;
  const finalScore = Math.max(0, rawScore - malus);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: {
        prompt,
        selected_docs: selectedKinds,
        attempts,
        output,
        verdict,
        malus,
        final_score: finalScore,
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
    showToast("Réponse enregistrée", "success");
    clearSavedPrompt();
  }, [teamId, submitState, prompt, selectedKinds, attempts, output, verdict, malus, finalScore, showToast, clearSavedPrompt]);

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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">
              Défi 4 — Trois courriers, un seul prompt
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Obtenez les 3 courriers d&apos;un coup. Le bon prompt, les bons documents.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={1500} startedAt={startedAt} />
          </div>
        </div>

        <FadeTransition phaseKey={phase}>

        {/* BRIEF — the hierarchical request */}
        {phase === "brief" && (
          <section className="mb-8">
            <div className="border-2 border-black p-6 bg-[#F5F5F5] whitespace-pre-line text-black leading-relaxed">
              {DEFI4_BRIEF}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setPhase("compose")}
                className="px-8 py-4 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl hover:bg-[#234a31] transition-colors"
              >
                Préparer les courriers
              </button>
            </div>
          </section>
        )}

        {/* COMPOSE — choose documents + write the single prompt */}
        {phase === "compose" && (
          <>
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-2">
                1. Quels documents donner à l&apos;IA ?
              </h2>
              <p className="text-[#4A4A4A] mb-4">
                L&apos;IA ne verra QUE les documents cochés. Choisissez ceux
                réellement utiles à ces 3 courriers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEFI4_DOCS.map((d) => (
                  <button
                    key={d.kind}
                    onClick={() => toggleDoc(d.kind)}
                    className={`text-left border-2 p-4 ${
                      selectedDocs[d.kind]
                        ? "border-[#2D5A3D] bg-[#F0F5F1]"
                        : "border-black bg-white"
                    }`}
                  >
                    <span className="font-bold text-black flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 border-2 text-xs ${
                          selectedDocs[d.kind]
                            ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                            : "border-black text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {d.label}
                    </span>
                    <span className="block text-sm text-[#4A4A4A] mt-1 ml-7">
                      {d.hint}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-2">
                2. Votre prompt unique
              </h2>
              <p className="text-[#4A4A4A] mb-4">
                Écrivez UN seul prompt pour obtenir les 3 courriers en même temps
                (à Camille en langage simple, à la MDPH, à l&apos;entreprise).
                Soyez précis sur chaque destinataire et le ton attendu.
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={generating}
                rows={6}
                placeholder="Ex : À partir des documents fournis, rédige trois courriers distincts pour officialiser le stage de Camille…"
                className="w-full border-2 border-black p-4 text-black bg-white focus:border-[#2D5A3D] focus:outline-none disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim() || attempts >= DEFI4_MAX_ATTEMPTS}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
                >
                  {attempts === 0
                    ? "Générer les 3 courriers"
                    : `Régénérer (essai ${attempts + 1}/${DEFI4_MAX_ATTEMPTS})`}
                </button>
                <span className="text-sm text-[#4A4A4A]">
                  {attemptsLeft > 0
                    ? `${attemptsLeft} essai(s) restant(s)`
                    : "Plus d'essai — validez votre résultat"}
                </span>
              </div>
            </section>

            {(output || generating) && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">Les 3 courriers</h2>
                <StreamedOutput content={output} loading={generating} />
                {output && !generating && (
                  <div className="flex justify-center mt-6">
                    <SubmitButton
                      state="idle"
                      onClick={handleValidate}
                      label="Valider ces courriers (évaluation IA)"
                    />
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* VERDICT — the AI judge */}
        {phase === "verdict" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Le verdict de l&apos;IA</h2>

            {judging && !verdict && (
              <div className="flex flex-col items-center gap-3 py-10 text-[#4A4A4A]">
                <span className="spinner spinner-lg" aria-label="Évaluation" />
                <p className="text-lg font-semibold">L&apos;IA évalue votre travail…</p>
              </div>
            )}

            {verdict && (
              <>
                <div className="border-2 border-[#2D5A3D] p-6 mb-6 bg-[#F5F5F5] text-center">
                  <p className="text-5xl font-bold text-[#2D5A3D]">{finalScore}/20</p>
                  <p className="text-[#4A4A4A] mt-2">{verdict.commentaire}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="border-2 border-black p-4 text-center">
                    <div className="text-sm text-[#4A4A4A]">Qualité du prompt</div>
                    <div className="text-2xl font-bold text-black">{verdict.prompt_quality}/10</div>
                  </div>
                  <div className="border-2 border-black p-4 text-center">
                    <div className="text-sm text-[#4A4A4A]">Qualité des courriers</div>
                    <div className="text-2xl font-bold text-black">{verdict.documents_quality}/10</div>
                  </div>
                  <div className="border-2 border-[#8B3A3A] p-4 text-center">
                    <div className="text-sm text-[#4A4A4A]">Malus essais ({attempts})</div>
                    <div className="text-2xl font-bold text-[#8B3A3A]">−{malus}</div>
                  </div>
                </div>

                {verdict.conseils?.length > 0 && (
                  <div className="border-2 border-black p-5 mb-6">
                    <h3 className="font-bold text-black mb-2">Pour aller plus loin</h3>
                    <ul className="list-disc pl-6 space-y-1 text-black">
                      {verdict.conseils.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-center">
                  <SubmitButton
                    state={submitState}
                    onClick={handleSubmit}
                    label="Valider et passer au défi suivant"
                  />
                </div>
              </>
            )}
          </section>
        )}
        </FadeTransition>
      </div>
    </div>
  );
}
