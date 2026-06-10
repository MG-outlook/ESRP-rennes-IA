"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/shared/Spinner";
import RichText from "@/components/shared/RichText";
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
      showToast("Brouillon restaure", "info");
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
    showToast("Mot de passe accepte — bienvenue !", "success");

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
      <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-white text-center">
        <p className="text-[#4A4A4A] mb-2 text-sm uppercase tracking-widest">
          Votre équipe
        </p>
        <p className="text-[#4A4A4A] mb-6 italic max-w-md">
          {readyPayload.team_essence}
        </p>
        <p className="text-[#4A4A4A] mb-2 text-sm uppercase tracking-widest">
          Mot de passe d&apos;équipe
        </p>
        <p className="text-4xl md:text-5xl font-bold text-[#2D5A3D] mb-10 tracking-wider">
          {readyPayload.password}
        </p>
        <button
          onClick={() => router.push("/lobby")}
          className="px-8 py-4 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] text-xl hover:bg-[#234a31] transition-colors"
        >
          Commencer la découverte de l&apos;IA
        </button>
        <p className="text-[#B8B8B8] text-sm mt-6">
          Notez bien votre mot de passe avant de continuer.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-4xl font-bold text-black animate-pulse">
              {">"}
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="mb-4">
            {msg.role === "user" ? (
              <div className="flex gap-2">
                <span className="text-[#2D5A3D] font-bold shrink-0">{">"}</span>
                <p className="text-black">{msg.content}</p>
              </div>
            ) : (
              <RichText text={msg.content} className="block text-[#4A4A4A] pl-5" />
            )}
          </div>
        ))}

        {streaming && messages[messages.length - 1]?.content === "" && (
          <span className="text-[#4A4A4A] pl-5 inline-flex items-center gap-2">
            <Spinner size="sm" />
            <span>Le Gardien reflechit...</span>
          </span>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!readyPayload && (
        <div className="sticky bottom-0 bg-white border-t-2 border-black">
          <form
            onSubmit={sendMessage}
            className="max-w-3xl mx-auto w-full p-4"
          >
            <div className="flex gap-3 items-center border-2 border-black px-4 py-3 focus-within:border-[#2D5A3D] transition-colors">
              <span className="text-[#2D5A3D] font-bold text-xl select-none">{">"}</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={streaming ? "Le Gardien répond…" : "Votre réponse…"}
                disabled={streaming}
                aria-label="Votre message au Gardien"
                className="flex-1 text-black bg-white outline-none border-none text-lg placeholder:text-[#B8B8B8]"
                autoFocus
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="px-4 py-1 bg-[#2D5A3D] text-white font-semibold text-sm disabled:opacity-40"
              >
                Envoyer
              </button>
            </div>
            <p className="text-xs text-[#B8B8B8] mt-2 pl-1">Appuyez sur Entrée ou cliquez Envoyer</p>
          </form>
        </div>
      )}
    </main>
  );
}
