import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const TEAM_CODE_PATTERN = /^\d{4}$/;

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error(
      "Configuration Supabase incomplete: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont requis."
    );
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let code: string;

  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim() : "";
  } catch {
    return errorResponse("Requete invalide.");
  }

  if (!TEAM_CODE_PATTERN.test(code)) {
    return errorResponse("Entrez un code equipe a 4 chiffres.");
  }

  let config: ReturnType<typeof getSupabaseConfig>;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Configuration Supabase incomplete.",
      500
    );
  }

  const admin = createSupabaseClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: team, error: teamError } = await admin
    .from("teams")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (teamError) {
    return errorResponse("Impossible de verifier le code equipe.", 500);
  }

  if (!team) {
    return errorResponse("Code equipe inconnu. Verifiez votre code.", 404);
  }

  const userPassword = crypto.randomUUID() + crypto.randomUUID();
  const userEmail = `team-${code}-${crypto.randomUUID()}@example.com`;

  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        source: "team_join",
        team_code: code,
      },
    });

  if (createError || !createdUser.user) {
    return errorResponse(
      createError?.message ?? "Impossible de creer la session equipe.",
      500
    );
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: userPassword,
  });

  if (signInError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return errorResponse("Impossible d'ouvrir la session equipe.", 500);
  }

  const { error: joinError } = await supabase.rpc("join_team", {
    p_code: code,
  });

  if (joinError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);

    if (joinError.message.includes("Code")) {
      return errorResponse("Code equipe inconnu. Verifiez votre code.", 404);
    }

    return errorResponse("Erreur lors de la connexion a l'equipe.", 500);
  }

  return response;
}
