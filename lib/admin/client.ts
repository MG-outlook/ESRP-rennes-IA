"use client";

/**
 * Client helper for the admin API. The animators authenticate with a shared
 * password (ADMIN_PASSWORD on Vercel), entered once and kept in sessionStorage.
 * All admin reads and writes go through /api/admin (service role), since the
 * RLS policies are team-scoped and would otherwise block the animator views.
 */

const STORAGE_KEY = "admin_pw";

function getPassword(): string {
  if (typeof window === "undefined") return "";
  let pw = sessionStorage.getItem(STORAGE_KEY);
  if (!pw) {
    pw = window.prompt("Mot de passe administrateur :") ?? "";
    if (pw) sessionStorage.setItem(STORAGE_KEY, pw);
  }
  return pw;
}

export function clearAdminPassword() {
  if (typeof window !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
}

export async function adminFetch<T = unknown>(
  action: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": getPassword(),
    },
    body: JSON.stringify({ action, ...data }),
  });

  if (res.status === 401) {
    clearAdminPassword();
    throw new Error("Mot de passe administrateur invalide. Rechargez la page.");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Action admin échouée");
  }
  return res.json() as Promise<T>;
}
