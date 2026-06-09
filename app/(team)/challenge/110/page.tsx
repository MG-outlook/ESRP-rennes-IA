"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import StreamedOutput from "@/components/shared/StreamedOutput";
import SubmitButton from "@/components/shared/SubmitButton";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_J_MINDMAP_PROMPT } from "@/lib/ai/prompts";

const CHALLENGE_ID = 110;

export default function BonusJPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [theme, setTheme] = useState("");
  const [markdownOutput, setMarkdownOutput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");
  const svgRef = useRef<HTMLDivElement>(null);

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

  // Render markmap when markdown is ready
  useEffect(() => {
    if (!markdownOutput || generating || !svgRef.current) return;

    let cancelled = false;
    async function renderMarkmap() {
      try {
        const libName = "markmap-lib";
        const viewName = "markmap-view";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markmapLib: any = await import(/* @vite-ignore */ libName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markmapView: any = await import(/* @vite-ignore */ viewName);
        const transformer = new markmapLib.Transformer();
        const { root } = transformer.transform(markdownOutput);

        if (cancelled || !svgRef.current) return;
        svgRef.current.innerHTML = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("style", "width: 100%; height: 500px;");
        svgRef.current.appendChild(svg);
        markmapView.Markmap.create(svg, undefined, root);
      } catch {
        // markmap not installed — show raw markdown instead
      }
    }
    renderMarkmap();
    return () => { cancelled = true; };
  }, [markdownOutput, generating]);

  const handleGenerate = useCallback(async () => {
    if (!teamId || generating || !theme.trim()) return;
    setGenerating(true);
    setMarkdownOutput("");

    await streamFromProxy({
      systemPrompt: BONUS_J_MINDMAP_PROMPT,
      messages: [{
        role: "user",
        content: `Thème de la carte mentale : ${theme}`,
      }],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 800,
      onChunk: (t) => setMarkdownOutput((p) => p + t),
      onDone: () => setGenerating(false),
      onError: () => setGenerating(false),
    });
  }, [teamId, generating, theme]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    const supabase = createClient();

    await supabase.from("submissions").insert({
      team_id: teamId,
      challenge_id: CHALLENGE_ID,
      payload: { theme, mindmap: markdownOutput },
      ai_provider: "proxy",
      model: "ai-proxy",
    });

    await supabase
      .from("team_progress")
      .update({ finished_at: new Date().toISOString() })
      .eq("team_id", teamId)
      .eq("challenge_id", CHALLENGE_ID);

    setSubmitState("done");
  }, [teamId, submitState, theme, markdownOutput]);

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
              Bonus J — La carte mentale
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Visualisez le parcours de Camille en carte mentale
            </p>
          </div>
          <Timer durationSec={600} startedAt={startedAt} />
        </div>

        {/* Theme input */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">
            Thème de la carte
          </h2>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            disabled={!!markdownOutput || generating}
            placeholder="Ex : Le parcours de Camille à l'ESRP — étapes, acteurs, outils"
            className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
          />
        </section>

        {/* Generate */}
        {!markdownOutput && !generating && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleGenerate}
              disabled={!theme.trim()}
              className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl disabled:opacity-50"
            >
              Générer la carte mentale
            </button>
          </div>
        )}

        {/* Markmap visualization */}
        {(markdownOutput || generating) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">Carte mentale</h2>
            <div
              ref={svgRef}
              className="border-2 border-black p-4 min-h-[500px] bg-[#F5F5F5]"
            />
            {/* Fallback: show raw markdown */}
            {generating && (
              <div className="mt-4">
                <StreamedOutput content={markdownOutput} loading={generating} />
              </div>
            )}
          </section>
        )}

        {/* Raw markdown always visible after generation */}
        {markdownOutput && !generating && (
          <details className="mb-8">
            <summary className="font-bold text-black cursor-pointer">
              Voir le markdown source
            </summary>
            <pre className="mt-2 border-2 border-black p-4 bg-[#F5F5F5] text-sm text-[#4A4A4A] whitespace-pre-wrap overflow-x-auto">
              {markdownOutput}
            </pre>
          </details>
        )}

        {/* Submit */}
        {markdownOutput && !generating && (
          <div className="flex justify-center">
            <SubmitButton state={submitState} onClick={handleSubmit} label="Valider" />
          </div>
        )}
      </div>
    </div>
  );
}
