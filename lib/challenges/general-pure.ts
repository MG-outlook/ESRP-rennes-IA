// Pure, dependency-free helpers for the generalist challenges so they can be
// unit-tested in isolation (no React, no Supabase imports).

/** Removes scripts/handlers and isolates the <svg> from a model response. */
export function sanitizeSvg(raw: string): string {
  let s = raw.replace(/```svg|```/g, "").trim();
  const start = s.indexOf("<svg");
  const end = s.lastIndexOf("</svg>");
  if (start !== -1 && end !== -1) s = s.slice(start, end + 6);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  return s;
}

/** Reads the JAUGE: N value from a persona reply, clamped to 0–100, or null. */
export function extractGauge(text: string): number | null {
  const m = text.match(/JAUGE\s*:\s*(\d+)/i);
  if (!m) return null;
  return Math.max(0, Math.min(100, Number(m[1])));
}

/** Removes the JAUGE: N marker from the final reply text. */
export function stripGauge(text: string): string {
  return text.replace(/\n?\s*JAUGE\s*:\s*\d+\s*/gi, "").trim();
}

/** During streaming, hides a trailing (possibly partial) JAUGE marker. */
export function stripGaugeStreaming(text: string): string {
  return text.replace(/\n?\s*JAUGE[\s\S]*$/i, "");
}

/** Extracts the first {...} JSON object from a model response, or null. */
export function parseJsonObject<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
