import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const TEAM_CODE_PATTERN = /^\d{4}$/;

type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey?: string;
};

function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Configuration Supabase incomplete: NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis."
    );
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function createCookieResponseClient(
  request: NextRequest,
  response: NextResponse,
  config: SupabaseConfig
) {
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
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
  });
}

async function joinTeamWithSession(
  supabase: ReturnType<typeof createCookieResponseClient>,
  code: string
) {
  const { error } = await supabase.rpc("join_team", { p_code: code });

  if (!error) return null;

  if (error.message.includes("Code")) {
    return errorResponse("Code equipe inconnu. Verifiez votre code.", 404);
  }

  console.error("join_team RPC failed", error);
  return errorResponse("Erreur lors de la connexion a l'equipe.", 502);
}

async function joinWithAnonymousSession(
  request: NextRequest,
  config: SupabaseConfig,
  code: string
): Promise<{ response: NextResponse | null }> {
  const response = NextResponse.json({ ok: true });
  const supabase = createCookieResponseClient(request, response, config);
  const { error: authError } = await supabase.auth.signInAnonymously();

  if (authError) {
    console.warn("Anonymous team auth failed", authError.message);
    return { response: null };
  }

  const joinErrorResponse = await joinTeamWithSession(supabase, code);
  if (joinErrorResponse) return { response: joinErrorResponse };

  return { response };
}

async function joinWithServiceRoleSession(
  request: NextRequest,
  config: Required<SupabaseConfig>,
  code: string
) {
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
    console.error("Team code lookup failed", teamError);
    return errorResponse("Impossible de verifier le code equipe.", 502);
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
    console.error("Team user creation failed", createError);
    return errorResponse("Impossible de creer la session equipe.", 502);
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createCookieResponseClient(request, response, config);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: userPassword,
  });

  if (signInError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    console.error("Team user sign-in failed", signInError);
    return errorResponse("Impossible d'ouvrir la session equipe.", 502);
  }

  const joinErrorResponse = await joinTeamWithSession(supabase, code);
  if (joinErrorResponse) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return joinErrorResponse;
  }

  return response;
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

  let config: SupabaseConfig;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    console.error(error);
    return errorResponse("Configuration Supabase incomplete.", 500);
  }

  const anonymousResult = await joinWithAnonymousSession(request, config, code);
  if (anonymousResult.response) {
    return anonymousResult.response;
  }

  if (!config.serviceRoleKey) {
    return errorResponse(
      "Connexion equipe indisponible: activez l'auth anonyme Supabase ou configurez SUPABASE_SERVICE_ROLE_KEY sur Vercel.",
      503
    );
  }

  return joinWithServiceRoleSession(
    request,
    { ...config, serviceRoleKey: config.serviceRoleKey },
    code
  );
}
