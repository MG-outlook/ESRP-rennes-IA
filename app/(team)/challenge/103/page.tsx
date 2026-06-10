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
import { BONUS_C_RAPO_PROMPT, BONUS_C_RAPO_FALC_PROMPT } from "@/lib/ai/prompts";

const CHALLENGE_ID = 103;

export default function BonusCPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [situation, setSituation] = useState("");
  const [rapoOutput, setRapoOutput] = useState("");
  const [falcOutput, setFalcOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

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
    if (!teamId || generating || !situation.trim()) return;
    setGenerating(true);
    setRapoOutput("");
    setFalcOutput("");

    let rapoFinished = false;
    let falcFinished = false;
    const checkDone = () => {
      if (rapoFinished && falcFinished) setGenerating(false);
    };

    // Generate RAPO and FALC in parallel
    streamFromProxy({
      systemPrompt: BONUS_C_RAPO_PROMPT,
      messages: [{ role: "user", content: `Situation de Camille : ${situation}` }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setRapoOutput((p) => p + t),
      onDone: () => { rapoFinished = true; checkDone(); },
      onError: () => { rapoFinished = true; checkDone(); },
    });

    streamFromProxy({
      systemPrompt: BONUS_C_RAPO_FALC_PROMPT,
      messages: [{ role: "user", content: `Situation de Camille : ${situation}` }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setFalcOutput((p) => p + t),
      onDone: () => { falcFinished = true; checkDone(); },
      onError: () => { falcFinished = true; checkDone(); },
    });
  }, [teamId, generating, situation]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { situation, rapo: rapoOutput, falc: falcOutput },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
  }, [teamId, submitState, situation, rapoOutput, falcOutput]);

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
              Bonus C — La pièce manquante
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Un RAPO pour Camille, en version officielle et en FALC
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={600} startedAt={startedAt} />
          </div>
        </div>

        {/* Situation input */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">
            Décrivez la situation
          </h2>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            disabled={!!rapoOutput || generating}
            placeholder="Exemple : Camille a reçu un refus de renouvellement RQTH malgré un avis favorable du médecin..."
            rows={4}
            className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50 resize-none"
          />
        </section>

        {/* Generate button */}
        {!rapoOutput && !generating && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleGenerate}
              disabled={!situation.trim()}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
            >
              Générer le RAPO
            </button>
          </div>
        )}

        {/* Parallel outputs */}
        {(rapoOutput || falcOutput || generating) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                RAPO officiel
              </h2>
              <StreamedOutput content={rapoOutput} loading={generating && !rapoOutput} />
            </section>
            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                Version FALC
              </h2>
              <StreamedOutput content={falcOutput} loading={generating && !falcOutput} />
            </section>
          </div>
        )}

        {/* Submit */}
        {rapoOutput && falcOutput && !generating && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
