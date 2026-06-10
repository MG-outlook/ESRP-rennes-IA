// Shared scoring + document helpers, used by both the team-facing Défi 5 recap
// and the admin dashboard so titles, points and exports stay consistent.

export const CHALLENGE_TITLES: Record<number, string> = {
  0: "La Porte",
  1: "La Pré-admission",
  2: "Le tri des observations",
  3: "La Chasse aux mauvais prompts",
  4: "Trois courriers, un seul prompt",
  5: "Notre projet",
  101: "Bonus A — Le détective des doublons",
  102: "Bonus B — Le coach d'entretien",
  103: "Bonus C — La pièce manquante",
  104: "Bonus D — Brouillon de subvention",
  105: "Bonus E — Vrai ou Faux IA",
  106: "Bonus F — Le journal de Camille",
  107: "Bonus G — Le pitch en 30 secondes",
  108: "Bonus H — Le scénario de crise",
  109: "Bonus I — Le glossaire qui sauve",
  110: "Bonus J — La carte mentale du parcours",
};

export function challengeTitle(id: number): string {
  return CHALLENGE_TITLES[id] ?? `Défi ${id}`;
}

/**
 * Normalised score (0–20) for a challenge submission. Each challenge now writes
 * a `points` field into its payload; we fall back to older fields for
 * submissions created before that.
 */
export function computeChallengeScore(
  challengeId: number,
  payload: unknown
): number | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.points === "number") return Math.round(p.points);
  if (challengeId === 4 && typeof p.final_score === "number") {
    return Math.round(p.final_score);
  }
  if (challengeId === 3 && typeof p.score === "number") {
    return Math.round(p.score);
  }
  return null;
}

const DOC_LABELS: Record<string, string> = {
  ai_output: "Fiche de synthèse",
  pro_output: "Synthèse professionnelle",
  falc_output: "Version FALC",
  output: "Document produit",
  pact: "Pacte IA",
  analysis: "Analyse",
  journal: "Journal de Camille",
  glossaire: "Glossaire FALC",
  pitch: "Pitch",
  rapo: "Courrier RAPO",
  falc: "Version FALC",
  protocole: "Protocole",
  sms: "Message",
  subvention: "Demande de subvention",
  markdownOutput: "Carte mentale",
  mindmap: "Carte mentale",
};

function prettifyKey(key: string): string {
  return (
    DOC_LABELS[key] ??
    key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/**
 * Extracts the human-readable document(s) a team produced in a submission, for
 * admin viewing and .md export. Generic: any reasonably long string field is
 * treated as a produced document.
 */
export function extractDocuments(
  payload: unknown
): { label: string; markdown: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const docs: { label: string; markdown: string }[] = [];
  for (const [key, value] of Object.entries(p)) {
    if (typeof value === "string" && value.trim().length > 40) {
      docs.push({ label: prettifyKey(key), markdown: value });
    }
  }
  return docs;
}

/** Formats a duration between two ISO timestamps as "m min s". */
export function formatDuration(
  startIso: string | null,
  endIso: string | null
): string | null {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m} min ${s.toString().padStart(2, "0")}` : `${s} s`;
}
