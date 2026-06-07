"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/shared/Spinner";
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
  const match = text.match(/<READY>([\s\S]*?)<\/READY>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function stripReadyBlock(text: string): string {
  return text.replace(/<READY>[\s\S]*?<\/READY>/, "").trim();
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

    // Reveal animation
    setTimeout(() => setRevealed(true), 500);

    // Redirect after 4 seconds
    setTimeout(() => router.push("/lobby"), 4500);
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/porte-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (!res.ok) throw new Error("Erreur serveur");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

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

      await persistMessage("assistant", assistantContent);

      // Check for <READY> block
      const payload = parseReady(assistantContent);
      if (payload) {
        await handleReadyPayload(payload);
      } else {
        // Check if malformed READY - retry
        if (assistantContent.includes("<READY>") && !payload) {
          const retryMsg: Message = {
            role: "user",
            content: "Reformule ton bloc <READY> en JSON valide.",
          };
          setMessages((prev) => [...prev, retryMsg]);
          // Don't auto-retry to avoid loops - user can resend
        }
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

  // Password reveal screen
  if (readyPayload && revealed) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-white">
        <p className="text-[#4A4A4A] mb-4">{readyPayload.team_essence}</p>
        <p className="text-4xl font-bold text-[#2D5A3D] mb-8 tracking-wider">
          {readyPayload.password}
        </p>
        <p className="text-[#4A4A4A] opacity-60">Entrée dans l'atelier...</p>
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
              <p className="text-[#4A4A4A] pl-5">{msg.content}</p>
            )}
          </div>
        ))}

        {streaming && (
          <span className="text-[#4A4A4A] pl-5 inline-flex items-center gap-2">
            <Spinner size="sm" />
            <span>Le Gardien reflechit...</span>
          </span>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!readyPayload && (
        <form
          onSubmit={sendMessage}
          className="border-t-2 border-black p-4 max-w-3xl mx-auto w-full"
        >
          <div className="flex gap-2 items-center">
            <span className="text-[#2D5A3D] font-bold text-xl">{">"}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder=""
              disabled={streaming}
              aria-label="Votre message au Gardien"
              className="flex-1 text-black bg-white outline-none border-none text-lg"
              autoFocus
            />
          </div>
        </form>
      )}
    </main>
  );
}
