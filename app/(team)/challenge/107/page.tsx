"use client";

import { useState, useEffect, useCallback } from "react";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Spinner from "@/components/shared/Spinner";
import SubmitButton from "@/components/shared/SubmitButton";
import DossierAppui from "@/components/challenges/DossierAppui";
import SuggestionChips from "@/components/shared/SuggestionChips";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_G_PITCH_PROMPT, BONUS_G_SUGGESTIONS } from "@/lib/ai/prompts";
import { useChallengeInit, finishChallenge } from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 107;
const MAX_ATTEMPTS = 2;

interface Attempt {
  competence: string;
  motivation: string;
  projet: string;
  pitch: string;
}

type Phase = "write" | "choose";

export default function BonusGPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("write");
  const [competence, setCompetence] = useState("");
  const [motivation, setMotivation] = useState("");
  const [projet, setProjet] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [justification, setJustification] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");
  const [canSpeak, setCanSpeak] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const ready = competence.trim() && motivation.trim() && projet.trim();

  const handleRun = useCallback(async () => {
    if (!teamId || running || !ready || attempts.length >= MAX_ATTEMPTS) return;
    const snapshot = {
      competence: competence.trim(),
      motivation: motivation.trim(),
      projet: projet.trim(),
    };
    setRunning(true);
    setStreamingText("");
    let txt = "";
    await streamFromProxy({
      systemPrompt: BONUS_G_PITCH_PROMPT,
      messages: [
        {
          role: "user",
          content: `Compétence : ${snapshot.competence}\nMotivation : ${snapshot.motivation}\nProjet : ${snapshot.projet}`,
        },
      ],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 600,
      onChunk: (t) => {
        txt += t;
        setStreamingText(txt);
      },
      onDone: () => {
        setAttempts((prev) => [...prev, { ...snapshot, pitch: txt.trim() }]);
        setStreamingText("");
        setRunning(false);
      },
      onError: () => setRunning(false),
    });
  }, [teamId, running, ready, competence, motivation, projet, attempts.length]);

  const handleSpeak = useCallback(
    (idx: number, text: string) => {
      if (!canSpeak || !text) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "fr-FR";
      utter.rate = 1;
      utter.onend = () => setSpeakingIdx(null);
      utter.onerror = () => setSpeakingIdx(null);
      setSpeakingIdx(idx);
      window.speechSynthesis.speak(utter);
    },
    [canSpeak]
  );

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle" || selected === null) return;
    setSubmitState("loading");
    const chosen = attempts[selected];
    await finishChallenge(CHALLENGE_ID, teamId, {
      competence: chosen?.competence ?? null,
      motivation: chosen?.motivation ?? null,
      projet: chosen?.projet ?? null,
      pitch: chosen?.pitch ?? null,
      attempts,
      justification,
    });
    setSubmitState("done");
  }, [teamId, submitState, selected, attempts, justification]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  const attemptsLeft = MAX_ATTEMPTS - attempts.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-black">
              Bonus G — Le pitch en 30 secondes
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Faites générer deux pitchs, écoutez-les, et choisissez le meilleur.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={900} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        {/* Phase 1 : éléments + génération (jusqu'à 2 essais) */}
        {phase === "write" && (
          <section className="mb-8">
            <DossierAppui
              intro="Camille se présente pour le stage d'accueil-secrétariat chez Bureaux & Solutions. Piochez ses vrais atouts dans le dossier — sa lettre et la fiche médicale (aptitudes conservées) en regorgent."
              docs={["motivation_letter", "medical_sheet"]}
            />
            <div className="flex flex-col gap-4 mb-4">
              <label className="flex flex-col gap-1">
                <span className="font-bold text-black">Une compétence forte</span>
                <input
                  type="text"
                  value={competence}
                  onChange={(e) => setCompetence(e.target.value)}
                  disabled={running || attempts.length >= MAX_ATTEMPTS}
                  placeholder="Ex : sens de l'organisation, relationnel…"
                  className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
                />
                <SuggestionChips
                  suggestions={BONUS_G_SUGGESTIONS.competence}
                  onPick={setCompetence}
                  disabled={running || attempts.length >= MAX_ATTEMPTS}
                  label="Tiré du dossier de Camille :"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-bold text-black">Une motivation</span>
                <input
                  type="text"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  disabled={running || attempts.length >= MAX_ATTEMPTS}
                  placeholder="Ex : envie d'un métier de bureau avec du lien humain"
                  className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
                />
                <SuggestionChips
                  suggestions={BONUS_G_SUGGESTIONS.motivation}
                  onPick={setMotivation}
                  disabled={running || attempts.length >= MAX_ATTEMPTS}
                  label="Tiré du dossier de Camille :"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-bold text-black">Un projet</span>
                <input
                  type="text"
                  value={projet}
                  onChange={(e) => setProjet(e.target.value)}
                  disabled={running || attempts.length >= MAX_ATTEMPTS}
                  placeholder="Ex : un poste d'accueil-secrétariat"
                  className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
                />
                <SuggestionChips
                  suggestions={BONUS_G_SUGGESTIONS.projet}
                  onPick={setProjet}
                  disabled={running || attempts.length >= MAX_ATTEMPTS}
                  label="Tiré du dossier de Camille :"
                />
              </label>
            </div>
            <p className="text-sm text-[#4A4A4A] mb-3">
              Ajustez les éléments entre les deux essais pour comparer ce que ça
              change dans le pitch.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-[#4A4A4A]">
                {attemptsLeft > 0
                  ? `Essais restants : ${attemptsLeft} / ${MAX_ATTEMPTS}`
                  : "Vous avez généré vos 2 pitchs."}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handleRun}
                  disabled={running || !ready || attempts.length >= MAX_ATTEMPTS}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50"
                >
                  {running
                    ? "Génération…"
                    : `Générer le pitch ${Math.min(attempts.length + 1, MAX_ATTEMPTS)}/${MAX_ATTEMPTS}`}
                </button>
                {attempts.length > 0 && (
                  <button
                    onClick={() => {
                      setSelected(null);
                      setPhase("choose");
                    }}
                    disabled={running}
                    className="px-6 py-3 bg-white text-[#2D5A3D] font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50"
                  >
                    Comparer et choisir →
                  </button>
                )}
              </div>
            </div>

            {running && (
              <div className="mt-6">
                <h3 className="font-bold text-black mb-1">
                  Pitch {attempts.length + 1} — en cours
                </h3>
                <div className="border-2 border-[#2D5A3D] p-4 min-h-[80px] text-lg">
                  {streamingText || (
                    <span className="inline-flex items-center gap-2 text-[#4A4A4A]">
                      <Spinner size="sm" />
                      <span>L&apos;IA rédige le pitch…</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {!running && attempts.length > 0 && (
              <div className="mt-6 flex flex-col gap-4">
                <h3 className="font-bold text-black">
                  Vos pitchs ({attempts.length}/{MAX_ATTEMPTS})
                </h3>
                {attempts.map((a, i) => (
                  <div key={i} className="border-2 border-black p-4">
                    <p className="text-sm font-bold text-[#2D5A3D] mb-2">
                      Pitch {i + 1}
                    </p>
                    <p className="text-black text-lg whitespace-pre-line">{a.pitch}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Phase 2 : écouter, choisir, justifier */}
        {phase === "choose" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Écoutez, comparez, choisissez
            </h2>
            <p className="text-[#4A4A4A] mb-5">
              Lequel présente Camille de la façon la plus juste et la plus
              valorisante ?
            </p>

            <div className="flex flex-col gap-4">
              {attempts.map((a, i) => {
                const isSelected = selected === i;
                return (
                  <div
                    key={i}
                    className={`border-2 p-4 ${
                      isSelected ? "border-[#2D5A3D] bg-[#F0F5F1]" : "border-black"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-sm font-bold text-[#2D5A3D]">
                        Pitch {i + 1}
                      </span>
                      <div className="flex gap-2">
                        {canSpeak && (
                          <button
                            onClick={() => handleSpeak(i, a.pitch)}
                            disabled={speakingIdx !== null}
                            className="px-3 py-1 border-2 border-[#2D5A3D] text-[#2D5A3D] text-sm font-semibold disabled:opacity-50"
                          >
                            {speakingIdx === i ? "🔊 Lecture…" : "▶ Écouter"}
                          </button>
                        )}
                        <button
                          onClick={() => setSelected(i)}
                          aria-pressed={isSelected}
                          className={`px-3 py-1 border-2 text-sm font-semibold ${
                            isSelected
                              ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                              : "border-black text-black"
                          }`}
                        >
                          {isSelected ? "✓ Choisi" : "Choisir"}
                        </button>
                      </div>
                    </div>
                    <p className="text-black text-lg whitespace-pre-line">{a.pitch}</p>
                  </div>
                );
              })}
            </div>

            <label className="block font-bold text-black mt-6 mb-2">
              Pourquoi ce choix ? (une ligne)
            </label>
            <input
              type="text"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex : il met mieux en avant le lien humain sans en faire trop."
              className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none"
            />

            <div className="flex flex-wrap justify-between gap-3 mt-6">
              {attempts.length < MAX_ATTEMPTS && (
                <button
                  onClick={() => setPhase("write")}
                  className="px-5 py-3 bg-white text-black font-semibold border-2 border-black"
                >
                  ← Générer un autre pitch
                </button>
              )}
              <SubmitButton
                state={submitState}
                onClick={handleSubmit}
                label="Valider"
                disabled={selected === null || !justification.trim()}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
