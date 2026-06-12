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
import { BONUS_H_CRISE_PROMPT, BONUS_H_SCENARIOS } from "@/lib/ai/prompts";

const CHALLENGE_ID = 108;

export default function BonusHPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [teamSms, setTeamSms] = useState("");
  const [protocolOutput, setProtocolOutput] = useState("");
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
    if (!teamId || generating || !selectedScenario || !teamSms.trim()) return;
    setGenerating(true);
    setProtocolOutput("");

    const scenario = BONUS_H_SCENARIOS.find((s) => s.id === selectedScenario);
    if (!scenario) return;

    await streamFromProxy({
      systemPrompt: BONUS_H_CRISE_PROMPT,
      messages: [{
        role: "user",
        content: `Scénario de crise : "${scenario.label}"\nContexte : ${scenario.context}\n\nSMS rédigé par l'équipe (premier contact) :\n"""${teamSms.trim()}"""\n\nGénère le protocole en 4 étapes, ton SMS de premier contact, puis ton regard sur le SMS de l'équipe.`,
      }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setProtocolOutput((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, selectedScenario, teamSms]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { scenario: selectedScenario, teamSms, protocol: protocolOutput },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
  }, [teamId, submitState, selectedScenario, teamSms, protocolOutput]);

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
            <h1 className="text-4xl font-bold text-black">
              Bonus H — Le scénario de crise
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Un protocole en 4 étapes + un SMS d&apos;alerte
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={600} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        {/* Scenario selection */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">
            Choisissez un scénario
          </h2>
          <div className="flex flex-col gap-3">
            {BONUS_H_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                disabled={generating || !!protocolOutput}
                className={`border-2 p-4 text-left ${
                  selectedScenario === s.id
                    ? "border-[#2D5A3D] bg-[#F5F5F5]"
                    : "border-black bg-white"
                } disabled:cursor-default`}
              >
                <p className="font-bold text-black">{s.label}</p>
                <p className="text-sm text-[#4A4A4A]">{s.context}</p>
              </button>
            ))}
          </div>
        </section>

        {/* À vous d'abord : le SMS de l'équipe, avant celui de l'IA */}
        {selectedScenario && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              À vous d&apos;abord : votre SMS de premier contact
            </h2>
            <p className="text-[#4A4A4A] mb-3">
              Avant de voir la proposition de l&apos;IA, rédigez en équipe le SMS
              que <strong>vous</strong> enverriez à Camille. L&apos;IA proposera
              ensuite le sien — et donnera son regard sur le vôtre.
            </p>
            <textarea
              value={teamSms}
              onChange={(e) => setTeamSms(e.target.value)}
              disabled={generating || !!protocolOutput}
              rows={3}
              maxLength={320}
              placeholder="Bonjour Camille, …"
              className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-[#4A4A4A] mt-1">
              {teamSms.length}/320 caractères — un SMS, pas une lettre.
            </p>
          </section>
        )}

        {/* Generate */}
        {selectedScenario && !protocolOutput && !generating && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleGenerate}
              disabled={!teamSms.trim()}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
            >
              Comparer avec l&apos;IA
            </button>
          </div>
        )}

        {/* Output */}
        {(protocolOutput || generating) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              La proposition de l&apos;IA — et son regard sur votre SMS
            </h2>
            <StreamedOutput content={protocolOutput} loading={generating} />
          </section>
        )}

        {/* Submit */}
        {protocolOutput && !generating && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
