import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

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

type JoinResult =
  | { ok: true; response: NextResponse }
  | { ok: false; response?: NextResponse; reason?: string };

/**
 * Calls the join_team RPC on an already-authenticated client. Returns null on
 * success, or an error response to send back to the client.
 */
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

/**
 * Primary path: open an anonymous Supabase session. Requires "Anonymous
 * sign-ins" to be enabled in the Supabase project (Authentication providers).
 */
async function joinWithAnonymousSession(
  request: NextRequest,
  config: SupabaseConfig,
  code: string
): Promise<JoinResult> {
  const response = NextResponse.json({ ok: true });
  const supabase = createCookieResponseClient(request, response, config);
  const { error: authError } = await supabase.auth.signInAnonymously();

  if (authError) {
    console.warn("Anonymous team auth failed:", authError.message);
    return { ok: false, reason: authError.message };
  }

  const joinErrorResponse = await joinTeamWithSession(supabase, code);
  if (joinErrorResponse) return { ok: false, response: joinErrorResponse };

  return { ok: true, response };
}

/**
 * Fallback path: when anonymous sign-ins are disabled, mint a per-team session
 * with the service role. Creates a confirmed user, then opens a session for it.
 * We try a magic-link (OTP) verification first because it is more robust than a
 * password sign-in, then fall back to password if needed.
 */
async function joinWithServiceRoleSession(
  request: NextRequest,
  config: Required<SupabaseConfig>,
  code: string
): Promise<JoinResult> {
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
    return { ok: false, response: errorResponse("Impossible de verifier le code equipe.", 502) };
  }

  if (!team) {
    return { ok: false, response: errorResponse("Code equipe inconnu. Verifiez votre code.", 404) };
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
    return {
      ok: false,
      response: errorResponse("Impossible de creer la session equipe.", 502),
    };
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createCookieResponseClient(request, response, config);

  const signInReason = await openServiceRoleSession(
    admin,
    supabase,
    userEmail,
    userPassword
  );

  if (signInReason) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    console.error("Team user sign-in failed:", signInReason);
    return { ok: false, reason: signInReason };
  }

  const joinErrorResponse = await joinTeamWithSession(supabase, code);
  if (joinErrorResponse) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return { ok: false, response: joinErrorResponse };
  }

  return { ok: true, response };
}

/**
 * Opens a cookie session for the just-created team user. Tries magic-link OTP
 * verification first, then password sign-in. Returns null on success or the
 * underlying error message on failure.
 */
async function openServiceRoleSession(
  admin: SupabaseClient,
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<string | null> {
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({ type: "magiclink", email });

  const tokenHash = linkData?.properties?.hashed_token;
  if (!linkError && tokenHash) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });
    if (!otpError) return null;
    console.warn("Magic-link verification failed, trying password:", otpError.message);
  } else if (linkError) {
    console.warn("generateLink failed, trying password:", linkError.message);
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return signInError ? signInError.message : null;
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
  if (anonymousResult.ok) return anonymousResult.response;
  if (anonymousResult.response) return anonymousResult.response;

  // Anonymous sign-in is unavailable. Fall back to the service role if present.
  if (config.serviceRoleKey) {
    const serviceResult = await joinWithServiceRoleSession(
      request,
      { ...config, serviceRoleKey: config.serviceRoleKey },
      code
    );
    if (serviceResult.ok) return serviceResult.response;
    if (serviceResult.response) return serviceResult.response;

    // Both GoTrue paths failed: surface the real cause so it can be fixed.
    return errorResponse(
      "Connexion equipe impossible : aucune methode d'authentification Supabase n'est active. " +
        "Activez « Anonymous sign-ins » (recommande) ou le provider Email dans Supabase " +
        `(Authentication → Providers). Detail technique : ${serviceResult.reason ?? "inconnu"}.`,
      503
    );
  }

  return errorResponse(
    "Connexion equipe impossible : activez « Anonymous sign-ins » dans Supabase " +
      "(Authentication → Providers), ou configurez SUPABASE_SERVICE_ROLE_KEY sur Vercel. " +
      `Detail technique : ${anonymousResult.reason ?? "auth anonyme indisponible"}.`,
    503
  );
}
