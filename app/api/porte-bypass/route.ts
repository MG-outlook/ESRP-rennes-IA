import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Raccourci « administrateur » de la Porte.
 *
 * Permet de franchir la porte du Gardien instantanément, sans dérouler la
 * conversation, en saisissant un code secret dans le champ de la page /porte.
 * Pensé pour gagner du temps lors d'une démonstration (devant une institution,
 * par exemple).
 *
 * Le code attendu est PORTE_BYPASS_CODE — une variable d'environnement lue
 * UNIQUEMENT côté serveur (jamais préfixée NEXT_PUBLIC_, donc jamais incluse
 * dans le bundle envoyé au navigateur). Vous êtes donc le seul à le connaître.
 * Tant que la variable n'est pas définie, la fonctionnalité est inactive et
 * aucune saisie n'est acceptée.
 */

/** Comparaison à temps constant (évite de révéler le code par timing). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  // Réservé aux sessions équipe authentifiées (même garde que /api/porte-chat).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const expected = process.env.PORTE_BYPASS_CODE;
  // Fonctionnalité désactivée tant qu'aucun code n'est configuré côté serveur.
  if (!expected) {
    return NextResponse.json({ match: false });
  }

  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return NextResponse.json({ match: false });

  return NextResponse.json({ match: safeEqual(code, expected) });
}
