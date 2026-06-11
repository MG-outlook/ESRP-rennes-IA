"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import InstructionsButton from "@/components/shared/InstructionsButton";
import ChallengeIntro from "@/components/shared/ChallengeIntro";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Timer from "@/components/shared/Timer";
import Spinner from "@/components/shared/Spinner";
import Markdown from "@/components/shared/Markdown";
import SubmitButton from "@/components/shared/SubmitButton";
import { streamFromProxy } from "@/lib/ai/proxy";
import { BONUS_J_MINDMAP_PROMPT } from "@/lib/ai/prompts";
import { useChallengeInit, finishChallenge } from "@/lib/challenges/general-helpers";

const CHALLENGE_ID = 110;
const MAX_ATTEMPTS = 2;

type Phase = "write" | "choose" | "edit";

export default function BonusJPage() {
  const { teamId, startedAt } = useChallengeInit(CHALLENGE_ID);
  const [phase, setPhase] = useState<Phase>("write");
  const [prompt, setPrompt] = useState("");
  const [attempts, setAttempts] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done">("idle");
  const svgRef = useRef<HTMLDivElement>(null);

  // Best-effort markmap render of the edited outline. If the optional libraries
  // aren't available, the Markdown preview below still shows the structure.
  useEffect(() => {
    if (phase !== "edit" || !markdown || !svgRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        // Optional deps: referenced via variables so the build doesn't require
        // them. If absent, the Markdown preview below is the reliable fallback.
        const libName = "markmap-lib";
        const viewName = "markmap-view";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markmapLib: any = await import(/* webpackIgnore: true */ libName);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markmapView: any = await import(/* webpackIgnore: true */ viewName);
        const transformer = new markmapLib.Transformer();
        const { root } = transformer.transform(markdown);
        if (cancelled || !svgRef.current) return;
        svgRef.current.innerHTML = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("style", "width: 100%; height: 460px;");
        svgRef.current.appendChild(svg);
        markmapView.Markmap.create(svg, undefined, root);
      } catch {
        // markmap optional — Markdown preview is the reliable fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, markdown]);

  const handleRun = useCallback(async () => {
    if (!teamId || running || !prompt.trim() || attempts.length >= MAX_ATTEMPTS)
      return;
    const usedPrompt = prompt.trim();
    setRunning(true);
    setStreamingText("");
    let txt = "";
    await streamFromProxy({
      systemPrompt: BONUS_J_MINDMAP_PROMPT,
      messages: [
        { role: "user", content: `Consigne de structure de l'équipe : ${usedPrompt}` },
      ],
      challengeId: CHALLENGE_ID,
      teamId,
      maxTokens: 1200,
      onChunk: (t) => {
        txt += t;
        setStreamingText(txt);
      },
      onDone: () => {
        setAttempts((prev) => [...prev, txt.trim()]);
        setStreamingText("");
        setRunning(false);
      },
      onError: () => setRunning(false),
    });
  }, [teamId, running, prompt, attempts.length]);

  const handleSubmit = useCallback(async () => {
    if (!teamId || submitState !== "idle") return;
    setSubmitState("loading");
    await finishChallenge(CHALLENGE_ID, teamId, {
      prompt,
      attempts,
      mindmap: markdown,
    });
    setSubmitState("done");
  }, [teamId, submitState, prompt, attempts, markdown]);

  const intro = CHALLENGE_INTROS[CHALLENGE_ID];
  const [introDone, setIntroDone] = useState(false);
  if (!introDone)
    return <ChallengeIntro {...intro} onStart={() => setIntroDone(true)} />;

  const attemptsLeft = MAX_ATTEMPTS - attempts.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-black">
              Bonus J — La carte mentale
            </h1>
            <p className="text-[#4A4A4A] mt-2">
              Demandez une structure, choisissez la plus claire, puis
              réorganisez-la.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <InstructionsButton content={intro} />
            <Timer durationSec={600} startedAt={startedAt} challengeId={CHALLENGE_ID} />
          </div>
        </div>

        {/* Phase 1 : décrire la structure voulue + essais */}
        {phase === "write" && (
          <section className="mb-8">
            <label className="block font-bold text-black mb-2">
              Quelle carte voulez-vous ?
            </label>
            <p className="text-sm text-[#4A4A4A] mb-2">
              Décrivez la structure : le point central, les grandes branches, le
              niveau de détail. C&apos;est votre consigne qui guide l&apos;IA.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={running || attempts.length >= MAX_ATTEMPTS}
              placeholder="Ex : carte du parcours de Camille à l'ESRP. Branches : situation, santé, formation, projet pro. 2 ou 3 sous-points par branche, formulations courtes."
              className="w-full border-2 border-black p-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <span className="text-sm text-[#4A4A4A]">
                {attemptsLeft > 0
                  ? `Essais restants : ${attemptsLeft} / ${MAX_ATTEMPTS}`
                  : "Vous avez généré vos 2 structures."}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handleRun}
                  disabled={running || !prompt.trim() || attempts.length >= MAX_ATTEMPTS}
                  className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50"
                >
                  {running
                    ? "Génération…"
                    : `Générer la structure ${Math.min(attempts.length + 1, MAX_ATTEMPTS)}/${MAX_ATTEMPTS}`}
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
                  Structure {attempts.length + 1} — en cours
                </h3>
                <div className="border-2 border-[#2D5A3D] p-4 min-h-[100px]">
                  {streamingText ? (
                    <Markdown content={streamingText} />
                  ) : (
                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                      <Spinner size="sm" />
                      <span>L&apos;IA construit l&apos;arborescence…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!running && attempts.length > 0 && (
              <div className="mt-6 flex flex-col gap-4">
                <h3 className="font-bold text-black">
                  Vos structures ({attempts.length}/{MAX_ATTEMPTS})
                </h3>
                {attempts.map((a, i) => (
                  <div key={i} className="border-2 border-black p-4">
                    <p className="text-sm font-bold text-[#2D5A3D] mb-2">
                      Structure {i + 1}
                    </p>
                    <Markdown content={a} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Phase 2 : choisir la structure la plus claire */}
        {phase === "choose" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Choisissez la structure la plus claire
            </h2>
            <p className="text-[#4A4A4A] mb-5">
              Vous pourrez ensuite la simplifier et la réorganiser à votre main.
            </p>

            <div className="flex flex-col gap-4">
              {attempts.map((a, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    aria-pressed={isSelected}
                    className={`text-left border-2 p-4 transition-colors ${
                      isSelected
                        ? "border-[#2D5A3D] bg-[#F0F5F1]"
                        : "border-black bg-white hover:border-[#2D5A3D]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-[#2D5A3D]">
                        Structure {i + 1}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[#2D5A3D]" : "text-[#B8B8B8]"
                        }`}
                      >
                        {isSelected ? "✓ Choisie" : "Choisir"}
                      </span>
                    </div>
                    <Markdown content={a} />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-between gap-3 mt-6">
              {attempts.length < MAX_ATTEMPTS && (
                <button
                  onClick={() => setPhase("write")}
                  className="px-5 py-3 bg-white text-black font-semibold border-2 border-black"
                >
                  ← Générer une autre structure
                </button>
              )}
              <button
                onClick={() => {
                  if (selected !== null) setMarkdown(attempts[selected]);
                  setPhase("edit");
                }}
                disabled={selected === null}
                className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-lg disabled:opacity-50 ml-auto"
              >
                Réorganiser cette carte →
              </button>
            </div>
          </section>
        )}

        {/* Phase 3 : éditer / réorganiser puis valider */}
        {phase === "edit" && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-2">
              Simplifiez et réorganisez
            </h2>
            <p className="text-[#4A4A4A] mb-5">
              Modifiez le plan ci-dessous (titres avec #, ##, ### et listes). La
              carte se met à jour automatiquement.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={18}
                className="w-full border-2 border-black p-3 font-mono text-sm text-black focus:border-[#2D5A3D] focus:outline-none"
              />
              <div>
                <div
                  ref={svgRef}
                  className="border-2 border-black p-2 min-h-[200px] bg-[#F5F5F5] mb-3"
                />
                <div className="border-2 border-[#B8B8B8] p-4">
                  <Markdown content={markdown} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-3 mt-6">
              <button
                onClick={() => setPhase("choose")}
                className="px-5 py-3 bg-white text-black font-semibold border-2 border-black"
              >
                ← Revenir au choix
              </button>
              <SubmitButton
                state={submitState}
                onClick={handleSubmit}
                label="Valider"
                disabled={!markdown.trim()}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
