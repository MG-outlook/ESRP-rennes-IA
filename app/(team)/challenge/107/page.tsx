"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_G_PITCH_PROMPT } from "@/lib/ai/prompts";

const CHALLENGE_ID = 107;

export default function BonusGPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [competence, setCompetence] = useState("");
  const [motivation, setMotivation] = useState("");
  const [projet, setProjet] = useState("");
  const [pitch, setPitch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    setCanSpeak(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

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

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating) return;
    if (!competence.trim() || !motivation.trim() || !projet.trim()) return;
    setGenerating(true);
    setPitch("");
    await streamFromProxy({
      systemPrompt: BONUS_G_PITCH_PROMPT,
      messages: [{
        role: "user",
        content: `Compétence : ${competence}\nMotivation : ${motivation}\nProjet : ${projet}`,
      }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setPitch((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, competence, motivation, projet]);

  const handleSpeak = useCallback(() => {
    if (!canSpeak || !pitch) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(pitch);
    utter.lang = "fr-FR";
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [canSpeak, pitch]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { competence, motivation, projet, pitch },
      ai_provider: "proxy",
      model: "ai-proxy",
    });
    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);
    setSubmitState("done");
  }, [teamId, submitState, competence, motivation, projet, pitch]);

  const ready = competence.trim() && motivation.trim() && projet.trim();

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
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">Bonus G — Le pitch en 30 secondes</h1>
            <p className="text-[#4A4A4A] mt-2">
              3 éléments forts de Camille. L&apos;IA rédige le pitch. Écoutez-le.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={900} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <section className="mb-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-bold text-black">Une compétence forte</span>
            <input
              type="text"
              value={competence}
              onChange={(e) => setCompetence(e.target.value)}
              disabled={!!pitch || generating}
              placeholder="Ex : sens de l'organisation, relationnel…"
              className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-black">Une motivation</span>
            <input
              type="text"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              disabled={!!pitch || generating}
              placeholder="Ex : envie d'un métier de bureau avec du lien humain"
              className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold text-black">Un projet</span>
            <input
              type="text"
              value={projet}
              onChange={(e) => setProjet(e.target.value)}
              disabled={!!pitch || generating}
              placeholder="Ex : un poste d'accueil-secrétariat"
              className="border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
            />
          </label>
        </section>

        {!pitch && !generating && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleGenerate}
              disabled={!ready}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
            >
              Générer le pitch
            </button>
          </div>
        )}

        {(pitch || generating) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Le pitch de Camille</h2>
            <div className="border-2 border-black p-6 bg-[#F5F5F5] text-lg">
              <StreamedOutput content={pitch} loading={generating} />
            </div>
            {pitch && !generating && canSpeak && (
              <button
                onClick={handleSpeak}
                disabled={speaking}
                className="mt-4 px-5 py-2 border-2 border-[#2D5A3D] text-[#2D5A3D] font-semibold disabled:opacity-50"
              >
                {speaking ? "🔊 Lecture…" : "▶ Écouter le pitch"}
              </button>
            )}
          </section>
        )}

        {pitch && !generating && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
