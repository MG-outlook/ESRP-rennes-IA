"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/shared/Spinner";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  const joinTeam = useCallback(async () => {
    if (!code) {
      router.replace("/");
      return;
    }

    setError("");
    setRetrying(false);

    const supabase = createClient();
    const maxRetries = 2;
    const backoff = [1000, 2000];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw new Error("Erreur d'authentification");

        const { error: rpcError } = await supabase.rpc("join_team", {
          p_code: code,
        });

        if (rpcError) {
          if (rpcError.message.includes("Code")) {
            setError("Code equipe inconnu. Verifiez votre code.");
            return;
          }
          throw new Error("Erreur lors de la connexion");
        }

        router.replace("/porte");
        return;
      } catch (e) {
        if (attempt < maxRetries) {
          setRetrying(true);
          await new Promise((r) => setTimeout(r, backoff[attempt]));
        } else {
          setError(
            e instanceof Error ? e.message : "Connexion impossible. Reessayez."
          );
          setRetrying(false);
        }
      }
    }
  }, [code, router]);

  useEffect(() => {
    joinTeam();
  }, [joinTeam]);

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-white">
        <p className="text-[#8B3A3A] text-xl mb-6">{error}</p>
        <button
          onClick={() => joinTeam()}
          className="px-6 py-3 min-h-[44px] border-2 border-[#2D5A3D] text-[#2D5A3D] font-semibold mb-4"
        >
          Reessayer
        </button>
        <a
          href="/"
          className="px-6 py-3 min-h-[44px] border-2 border-black text-black font-semibold"
        >
          Retour
        </a>
      </main>
    );
  }

  return <JoinFallback retrying={retrying} />;
}

function JoinFallback({ retrying = false }: { retrying?: boolean }) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-white">
      <div className="flex items-center gap-3">
        <Spinner size="md" />
        <p className="text-[#4A4A4A] text-xl" aria-live="polite">
          {retrying ? "Nouvelle tentative de connexion..." : "Connexion en cours..."}
        </p>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinFallback />}>
      <JoinContent />
    </Suspense>
  );
}
