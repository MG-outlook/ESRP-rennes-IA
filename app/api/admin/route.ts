import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD non configuré côté serveur (variable Vercel)." },
      { status: 503 }
    );
  }
  if (req.headers.get("x-admin-password") !== expected) {
    return NextResponse.json(
      { error: "Mot de passe administrateur invalide." },
      { status: 401 }
    );
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY non configuré côté serveur." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const action = body.action as string;

  try {
    switch (action) {
      case "get_state": {
        const [teams, state] = await Promise.all([
          supabase
            .from("teams")
            .select("id, code, password, animator, composition, porte_passed_at")
            .order("code"),
          supabase
            .from("workshop_state")
            .select("is_paused, pause_reason, active_challenge_id")
            .eq("id", 1)
            .maybeSingle(),
        ]);
        if (teams.error) throw teams.error;
        return NextResponse.json({
          teams: teams.data ?? [],
          workshop_state:
            state.data ?? {
              is_paused: false,
              pause_reason: null,
              active_challenge_id: null,
            },
        });
      }

      case "get_dashboard": {
        const [teams, progress, scores] = await Promise.all([
          supabase
            .from("teams")
            .select("id, code, password, animator, composition")
            .order("code"),
          supabase
            .from("team_progress")
            .select("team_id, challenge_id, started_at, finished_at")
            .order("challenge_id", { ascending: false }),
          supabase.from("team_scores").select("team_id, score"),
        ]);
        if (teams.error) throw teams.error;
        return NextResponse.json({
          teams: teams.data ?? [],
          progress: progress.data ?? [],
          scores: scores.data ?? [],
        });
      }

      case "get_submissions": {
        const { data, error } = await supabase
          .from("submissions")
          .select("id, challenge_id, ai_provider, created_at, payload")
          .eq("team_id", body.team_id as string)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        return NextResponse.json({ submissions: data ?? [] });
      }

      case "pause": {
        const { error } = await supabase
          .from("workshop_state")
          .update({
            is_paused: true,
            pause_reason: (body.reason as string) ?? null,
            paused_at: nowIso(),
          })
          .eq("id", 1);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "resume": {
        const { error } = await supabase
          .from("workshop_state")
          .update({ is_paused: false, pause_reason: null, paused_at: null })
          .eq("id", 1);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "set_active_challenge": {
        const { error } = await supabase
          .from("workshop_state")
          .update({ active_challenge_id: body.challenge_id as number })
          .eq("id", 1);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "unlock_team": {
        const { error } = await supabase
          .from("teams")
          .update({
            password: body.password as string,
            composition: body.composition as Record<string, number>,
            porte_passed_at: nowIso(),
          })
          .eq("id", body.team_id as string);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case "activate_bonus": {
        const challengeId = body.challenge_id as number;
        const teamIds = body.team_ids as string[];
        if (!Array.isArray(teamIds) || teamIds.length === 0) {
          return NextResponse.json(
            { error: "Aucune équipe ciblée" },
            { status: 400 }
          );
        }
        const rows = teamIds.map((id) => ({
          team_id: id,
          challenge_id: challengeId,
          started_at: nowIso(),
        }));
        const { error } = await supabase
          .from("team_progress")
          .upsert(rows, { onConflict: "team_id,challenge_id" });
        if (error) throw error;
        await supabase.from("events").insert(
          teamIds.map((id) => ({
            team_id: id,
            type: "bonus_activated",
            payload: { challenge_id: challengeId },
          }))
        );
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (e) {
    console.error("admin action failed:", action, e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
