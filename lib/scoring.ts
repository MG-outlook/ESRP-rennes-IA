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
  201: "Défi A — Le pictogramme express",
  202: "Défi B — Le client mystère",
  203: "Défi C — La chasse à l'hallu",
  204: "Défi D — Le caméléon",
  205: "Défi E — La fabrique à idées",
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
  output: "Les courriers produits",
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
  rewriteOutput: "Réponse au prompt réécrit",
  rewrittenPrompt: "Prompt réécrit par l'équipe",
  chosenOutput: "Version retenue",
  prompt: "Prompt de l'équipe",
  reflection: "Ce que l'équipe a compris",
  justification: "Justification du choix",
  feedback: "Regard de l'IA",
  // Anciens destinataires du Défi 4 (format imbriqué)
  camille: "Courrier à Camille",
  parents: "Courrier aux parents",
  entreprise: "Courrier à l'entreprise",
  medecin: "Courrier au médecin",
  mdph: "Courrier à la MDPH",
};

const GENERIC_KEYS = new Set(["content", "text", "value", "markdown"]);

function prettifyKey(key: string): string {
  return (
    DOC_LABELS[key] ??
    key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/**
 * Extracts the human-readable document(s) a team produced in a submission, for
 * admin viewing and .md export. Recurses (depth-limited) into nested objects
 * and arrays so challenges that store documents inside sub-objects (e.g. Défi 3
 * rewrites, the old Défi 4 per-recipient format) are surfaced too. Any
 * reasonably long string is treated as a produced document.
 */
export function extractDocuments(
  payload: unknown
): { label: string; markdown: string }[] {
  const docs: { label: string; markdown: string }[] = [];
  const seen = new Set<string>();

  function walk(value: unknown, parentKey: string, key: string, depth: number) {
    if (depth > 4) return;
    if (typeof value === "string") {
      const text = value.trim();
      if (text.length > 40 && !seen.has(text)) {
        seen.add(text);
        // When the field name is generic ("content"), label by its parent.
        const labelKey = GENERIC_KEYS.has(key) && parentKey ? parentKey : key;
        docs.push({ label: prettifyKey(labelKey), markdown: value });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => walk(v, parentKey, key, depth + 1));
      return;
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, key, k, depth + 1);
      }
    }
  }

  walk(payload, "", "", 0);
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
