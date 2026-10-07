"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/shared/Spinner";
import RichText from "@/components/shared/RichText";
import Icon from "@/components/shared/Icon";
import { useAutoSave, useAutoSaveRestore } from "@/lib/hooks/useAutoSave";
import { useToast } from "@/lib/hooks/useToast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PorteReadyPayload {
  composition: {
    admin: number;
    medico_psy: number;
    formateur: number;
    insertion_pro: number;
    autre: number;
  };
  intention: string;
  singularite: string;
  password: string;
  team_essence: string;
}

function parseReady(text: string): PorteReadyPayload | null {
  const start = text.indexOf("<READY>");
  if (start === -1) return null;
  let body = text.slice(start + "<READY>".length);
  const end = body.indexOf("</READY>");
  if (end !== -1) body = body.slice(0, end);
  // Extract the JSON object even if surrounded by stray text, and tolerate a
  // trailing comma before the closing brace.
  const match = body.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const cleaned = match[0].replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(cleaned) as PorteReadyPayload;
  } catch {
    return null;
  }
}

function stripReadyBlock(text: string): string {
  // Remove a complete block, or — while streaming — everything from an opening
  // <READY> tag onward, so the raw JSON is never shown to the team.
  return text
    .replace(/<READY>[\s\S]*?<\/READY>/, "")
    .replace(/<READY>[\s\S]*$/, "")
    .trim();
}

/**
 * Charge utile neutre écrite quand la porte est franchie via le code
 * administrateur (raccourci de démonstration). Les valeurs sont volontairement
 * génériques : aucune équipe réelle n'est décrite ici.
 */
function buildBypassPayload(): PorteReadyPayload {
  return {
    composition: { admin: 0, medico_psy: 0, formateur: 0, insertion_pro: 0, autre: 0 },
    intention: "Démonstration",
    singularite: "Accès administrateur",
    password: "DEMO-ADMIN",
    team_essence: "Passage éclair pour la présentation.",
  };
}

export default function PortePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [readyPayload, setReadyPayload] = useState<PorteReadyPayload | null>(null);
  const [revealed, setRevealed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { show: showToast } = useToast();
  useAutoSave("porte-chat", messages);
  const { restored: restoredMessages, clear: clearSavedChat } = useAutoSaveRestore<Message[]>("porte-chat");

  useEffect(() => {
    if (restoredMessages && restoredMessages.length > 0 && messages.length === 0) {
      setMessages(restoredMessages);
      showToast("Brouillon restauré", "info");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function persistMessage(role: "user" | "assistant", content: string) {
    await supabase.from("porte_messages").insert({ role, content, team_id: (await getTeamId())! });
  }

  async function getTeamId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("team_sessions")
      .select("team_id")
      .eq("auth_uid", user.id)
      .single();
    return data?.team_id ?? null;
  }

  async function handleReadyPayload(payload: PorteReadyPayload) {
    setReadyPayload(payload);

    // Call validate_porte RPC
    await supabase.rpc("validate_porte", {
      p_composition: payload.composition,
      p_intention: payload.intention,
      p_singularite: payload.singularite,
      p_password: payload.password,
      p_team_essence: payload.team_essence,
    });

    clearSavedChat();
    showToast("Mot de passe accepté — bienvenue !", "success");

    // Reveal animation. The team then advances at their own pace via the button
    // (no auto-redirect, so they have time to read and note their password).
    setTimeout(() => setRevealed(true), 500);
  }

  /**
   * Streams one Gardien turn for the given conversation, appending a fresh
   * assistant bubble and updating it as tokens arrive (with any <READY> block
   * stripped from the display). Returns the full raw assistant text.
   */
  async function streamGardien(convo: Message[]): Promise<string> {
    const res = await fetch("/api/porte-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ messages: convo }),
    });
    if (!res.ok) throw new Error("Erreur serveur");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    let streamDone = false;

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          streamDone = true;
          break;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            const displayContent = stripReadyBlock(assistantContent);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: displayContent,
              };
              return updated;
            });
          }
        } catch {
          // skip unparseable
        }
      }
    }

    reader.cancel().catch(() => {});
    return assistantContent;
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    // Raccourci administrateur : si le texte saisi correspond exactement au code
    // secret (vérifié côté serveur, PORTE_BYPASS_CODE), on franchit la porte
    // immédiatement. Le code n'est jamais ajouté à la conversation ni enregistré,
    // donc il reste invisible à l'écran pendant une présentation. Toute saisie
    // qui ne correspond pas poursuit normalement le dialogue avec le Gardien.
    try {
      const res = await fetch("/api/porte-bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: text }),
      });
      if (res.ok) {
        const { match } = (await res.json()) as { match?: boolean };
        if (match) {
          setInput("");
          await handleReadyPayload(buildBypassPayload());
          return;
        }
      }
    } catch {
      // Échec réseau du contrôle : on ignore et on poursuit le flux normal.
    }

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    await persistMessage("user", text);

    try {
      let assistantContent = await streamGardien(newMessages);
      await persistMessage("assistant", assistantContent);

      let payload = parseReady(assistantContent);

      // If a READY block was emitted but its JSON was invalid, ask the Gardien
      // once — silently — to re-seal it. The correction instruction is sent to
      // the API only; it never appears in the visible conversation.
      if (!payload && assistantContent.includes("<READY>")) {
        const correctionConvo: Message[] = [
          ...newMessages,
          { role: "assistant", content: assistantContent },
          {
            role: "user",
            content:
              "Ton bloc <READY> n'était pas un JSON valide. Renvoie UNIQUEMENT le bloc <READY>{...}</READY> avec un JSON strictement valide (guillemets droits, pas de virgule finale), et rien d'autre.",
          },
        ];
        const corrected = await streamGardien(correctionConvo);
        await persistMessage("assistant", corrected);
        payload = parseReady(corrected);
        assistantContent = corrected;
      }

      if (payload) {
        await handleReadyPayload(payload);
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Erreur de connexion. Réessayez." },
      ]);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  // Password reveal screen — the team stays here until they choose to continue.
  if (readyPayload && revealed) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-surface text-center">
        <div className="w-full max-w-xl bg-white border border-line rounded-xl p-8 sm:p-10 flex flex-col items-center gap-5">
          <p role="status" className="badge bg-success-soft text-success-strong text-base">
            <Icon name="check" size={16} strokeWidth={3} />
            Porte franchie
          </p>
          <p className="text-ink-2 italic text-lg max-w-md">{readyPayload.team_essence}</p>
          <div className="w-full rounded-xl bg-success-soft px-6 py-7 flex flex-col items-center gap-2">
            <p className="font-bold text-success-strong">Votre mot de passe d&apos;équipe</p>
            <p className="font-mono text-3xl sm:text-4xl font-bold text-ink tracking-wide break-all">
              {readyPayload.password}
            </p>
          </div>
          <p className="text-ink-2">Notez-le bien avant de continuer.</p>
          <button
            onClick={() => router.push("/lobby")}
            className="btn btn-primary px-8 py-4 text-xl"
          >
            Commencer la découverte de l&apos;IA
            <Icon name="arrow-right" />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 bg-white">
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 pt-10 flex flex-wrap gap-10 items-start">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-7">
          <div className="flex flex-col gap-2">
            <p className="font-bold text-success">Étape d&apos;entrée</p>
            <h1 className="text-4xl">La Porte</h1>
            <p className="text-ink-2 text-lg">
              Répondez au Gardien. Il vous pose trois questions, puis vous confie
              votre mot de passe d&apos;équipe.
            </p>
          </div>

          <ol aria-label="Conversation avec le Gardien" aria-live="polite" className="flex flex-col gap-5">
            {messages.length === 0 && !streaming && (
              <li className="text-ink-2">
                Le Gardien vous attend. Écrivez un premier message pour le saluer.
              </li>
            )}

            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <li key={i} className="self-end max-w-[560px] flex flex-col items-end gap-1.5">
                  <span className="text-[0.85rem] font-bold text-ink-2">Votre équipe</span>
                  <p className="px-4 py-3 rounded-2xl rounded-br-sm bg-brand-soft text-lg">
                    {msg.content}
                  </p>
                </li>
              ) : msg.content ? (
                <li key={i} className="max-w-[640px] flex flex-col gap-1.5">
                  <span className="text-[0.85rem] font-bold text-brand">Le Gardien</span>
                  <RichText text={msg.content} className="block text-lg" />
                </li>
              ) : null
            )}

            {streaming && messages[messages.length - 1]?.content === "" && (
              <li className="inline-flex items-center gap-2 text-ink-2">
                <Spinner size="sm" />
                <span>Le Gardien réfléchit…</span>
              </li>
            )}
          </ol>

          <div ref={messagesEndRef} />
        </div>

        <aside className="flex-[1_1_280px] flex flex-col gap-4 p-6 border border-line rounded-xl bg-surface">
          <h2 className="text-lg">Le Gardien veut savoir</h2>
          <ol className="flex flex-col gap-3.5 leading-snug">
            {[
              ["Qui vous êtes", "les métiers présents, combien"],
              ["Ce que vous cherchez", "votre intention pour l'atelier"],
              ["Ce qui vous distingue", "la singularité de l'équipe"],
            ].map(([title, hint], i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full border-2 border-brand text-brand text-sm font-extrabold inline-flex items-center justify-center">
                  {i + 1}
                </span>
                <span>
                  <strong>{title}</strong>
                  <br />
                  <span className="text-ink-2">{hint}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="pt-3.5 border-t border-line text-ink-2 text-[0.9rem]">
            Notez bien le mot de passe qu&apos;il vous donnera : il vous servira
            pendant l&apos;atelier.
          </p>
        </aside>
      </div>

      {!readyPayload && (
        <div className="sticky bottom-0 mt-10 bg-white border-t border-line">
          <form
            onSubmit={sendMessage}
            className="max-w-6xl mx-auto w-full px-6 pt-4 pb-5 flex flex-col gap-2"
          >
            <label htmlFor="porte-input" className="font-bold">
              Votre réponse au Gardien
            </label>
            <div className="field flex gap-3 items-center pl-4 pr-2 py-2 focus-within:border-brand focus-within:outline-3 focus-within:outline-brand focus-within:outline-offset-2">
              <input
                id="porte-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={streaming ? "Le Gardien répond…" : "Votre réponse…"}
                disabled={streaming}
                className="flex-1 min-w-0 h-11 bg-transparent outline-none border-none text-lg"
                autoFocus
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="btn btn-primary px-5"
              >
                Envoyer
                <Icon name="arrow-right" size={18} />
              </button>
            </div>
            <p className="text-[0.85rem] text-muted">Appuyez sur Entrée ou sur Envoyer.</p>
          </form>
        </div>
      )}
    </main>
  );
}
