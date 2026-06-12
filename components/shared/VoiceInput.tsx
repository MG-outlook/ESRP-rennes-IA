"use client";

// Zone de saisie avec dictée vocale : la reconnaissance vocale du navigateur
// (Web Speech API, fr-FR) transcrit en direct dans le textarea. Le clavier
// reste TOUJOURS disponible : si le micro ou le navigateur ne suit pas, on
// tape sa note — le défi fonctionne de bout en bout sans voix.

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResultLike };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export default function VoiceInput({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
}: VoiceInputProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.stop();
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || listening) return;
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            const base = valueRef.current.trimEnd();
            onChange(base ? `${base} ${text}` : text);
          }
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, onChange]);

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {supported ? (
          <button
            type="button"
            onClick={listening ? stop : start}
            disabled={disabled}
            className={`px-4 py-2 border-2 font-semibold text-sm disabled:opacity-50 ${
              listening
                ? "bg-[#8B3A3A] border-[#8B3A3A] text-white"
                : "bg-white border-[#2D5A3D] text-[#2D5A3D]"
            }`}
          >
            {listening ? "⏹ Arrêter la dictée" : "🎤 Dicter au micro"}
          </button>
        ) : (
          <span className="text-sm text-[#4A4A4A]">
            Dictée vocale non disponible sur ce navigateur — tapez votre note
            (Chrome ou Edge pour le micro).
          </span>
        )}
        {listening && (
          <span className="text-sm text-[#2D5A3D] animate-pulse">
            🔴 Écoute en cours… parlez naturellement.
            {interim && <em className="text-[#4A4A4A]"> {interim}</em>}
          </span>
        )}
      </div>
    </div>
  );
}
