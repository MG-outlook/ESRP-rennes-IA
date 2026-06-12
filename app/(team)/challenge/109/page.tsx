"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import DocumentCamille, { getDocumentContent } from "@/components/challenges/DocumentCamille";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_I_GLOSSAIRE_PROMPT, BONUS_I_TERMS } from "@/lib/ai/prompts";

const CHALLENGE_ID = 109;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Termes de la vérité terrain retrouvés par l'équipe (tolérant aux variantes). */
function matchTermIds(teamTerms: string[]): Set<string> {
  const found = new Set<string>();
  for (const raw of teamTerms) {
    const n = normalize(raw);
    if (n.length < 3) continue;
    for (const gt of BONUS_I_TERMS) {
      if (
        gt.aliases.some(
          (a) => n === a || n.includes(a) || (a.includes(n) && n.length >= 4)
        )
      ) {
        found.add(gt.id);
      }
    }
  }
  return found;
}

export default function BonusIPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [termInput, setTermInput] = useState("");
  const [teamTerms, setTeamTerms] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [glossaire, setGlossaire] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");

  const courrier = getDocumentContent("mdph_letter");
  const foundIds = useMemo(() => matchTermIds(teamTerms), [teamTerms]);

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

  const handleAddTerm = useCallback(() => {
    const t = termInput.trim();
    if (!t || revealed) return;
    setTeamTerms((prev) =>
      prev.some((p) => normalize(p) === normalize(t)) ? prev : [...prev, t]
    );
    setTermInput("");
  }, [termInput, revealed]);

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating) return;
    setGenerating(true);
    setGlossaire("");
    await streamFromProxy({
      systemPrompt: BONUS_I_GLOSSAIRE_PROMPT,
      messages: [{ role: "user", content: `Courrier :\n\n${courrier}` }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 4000,
      onChunk: (t) => setGlossaire((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, courrier]);

  const handleReveal = useCallback(() => {
    if (teamTerms.length === 0 || revealed) return;
    setRevealed(true);
    handleGenerate();
  }, [teamTerms.length, revealed, handleGenerate]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();
    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: {
        teamTerms,
        found: [...foundIds],
        totalTerms: BONUS_I_TERMS.length,
        glossaire,
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
  }, [teamId, submitState, teamTerms, foundIds, glossaire]);

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
            <h1 className="text-4xl font-bold text-black">Bonus I — Le glossaire qui sauve</h1>
            <p className="text-[#4A4A4A] mt-2">
              Chassez les termes piégés, puis comparez avec l&apos;IA.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={CHALLENGE_INTROS[CHALLENGE_ID]} />
            <Timer durationSec={600} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">Le courrier reçu</h2>
          <DocumentCamille kind="mdph_letter" />
        </section>

        {/* À vous d'abord : la chasse aux termes */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-2">
            À vous d&apos;abord : la chasse aux termes
          </h2>
          <p className="text-[#4A4A4A] mb-3">
            Relisez le courrier avec les yeux de Camille : relevez tous les
            sigles et termes techniques qui peuvent bloquer la compréhension.
            Ajoutez-les un par un.
          </p>
          {!revealed && (
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTerm()}
                placeholder="Ex : RQTH"
                className="flex-1 border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none"
              />
              <button
                onClick={handleAddTerm}
                disabled={!termInput.trim()}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          )}
          {teamTerms.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {teamTerms.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-black text-sm font-semibold text-black"
                >
                  {t}
                  {!revealed && (
                    <button
                      onClick={() =>
                        setTeamTerms((prev) => prev.filter((p) => p !== t))
                      }
                      aria-label={`Retirer ${t}`}
                      className="text-[#8B3A3A] font-bold"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!revealed && (
            <div className="flex justify-center">
              <button
                onClick={handleReveal}
                disabled={teamTerms.length === 0}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
              >
                Révéler et comparer avec l&apos;IA
              </button>
            </div>
          )}
        </section>

        {/* Révélation : trouvés / manqués */}
        {revealed && (
          <section className="mb-8 border-2 border-[#2D5A3D] p-5">
            <h2 className="text-2xl font-bold text-black mb-2">La révélation</h2>
            <p className="text-[#4A4A4A] mb-3">
              Vous avez repéré{" "}
              <strong className="text-[#2D5A3D]">
                {foundIds.size} des {BONUS_I_TERMS.length}
              </strong>{" "}
              termes piégés du courrier.
            </p>
            <div className="flex flex-wrap gap-2">
              {BONUS_I_TERMS.map((t) => {
                const found = foundIds.has(t.id);
                return (
                  <span
                    key={t.id}
                    className={`px-3 py-1.5 border-2 text-sm font-semibold ${
                      found
                        ? "border-[#2D5A3D] text-[#2D5A3D]"
                        : "border-[#8B3A3A] text-[#8B3A3A]"
                    }`}
                  >
                    {found ? "✓" : "✗"} {t.label}
                  </span>
                );
              })}
            </div>
            <p className="text-sm text-[#4A4A4A] mt-3">
              C&apos;est tout l&apos;enjeu : quand on connaît le jargon, on ne le
              voit plus. L&apos;IA, elle, le relève systématiquement — et le
              traduit en FALC ci-dessous.
            </p>
          </section>
        )}

        {(glossaire || generating) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Glossaire FALC</h2>
            <StreamedOutput content={glossaire} loading={generating} />
          </section>
        )}

        {revealed && glossaire && !generating && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
