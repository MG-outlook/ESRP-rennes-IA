"use client";

import { useEffect, useRef } from "react";

const SAVE_INTERVAL = 5000;

export function useAutoSave(key: string, value: unknown): void {
  const prevJson = useRef<string>("");

  useEffect(() => {
    const fullKey = `fresque-ia:${key}`;
    const json = JSON.stringify(value);

    if (json === prevJson.current) return;
    prevJson.current = json;

    const timer = setInterval(() => {
      const currentJson = JSON.stringify(value);
      try {
        localStorage.setItem(fullKey, currentJson);
      } catch {
        // localStorage full or unavailable
      }
    }, SAVE_INTERVAL);

    return () => clearInterval(timer);
  }, [key, value]);
}

export function useAutoSaveRestore<T>(key: string): {
  restored: T | null;
  clear: () => void;
} {
  const fullKey = `fresque-ia:${key}`;
  let restored: T | null = null;

  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem(fullKey) : null;
    if (stored) {
      restored = JSON.parse(stored) as T;
    }
  } catch {
    // parse error or SSR
  }

  function clear() {
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // ignore
    }
  }

  return { restored, clear };
}
