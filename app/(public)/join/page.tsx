"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/shared/Spinner";
import Icon from "@/components/shared/Icon";
import { BrandLogo, BrandStripe } from "@/components/shared/Brand";

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

    const maxRetries = 2;
    const backoff = [1000, 2000];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("/api/team/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ code }),
        });

        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          const message = result.error ?? "Erreur lors de la connexion";
          const shouldRetry = response.status >= 500 && response.status !== 503;

          if (!shouldRetry) {
            setError(message);
            return;
          }

          throw new Error(message);
        }

        router.replace("/porte");
        return;
      } catch (e) {
        if (attempt < maxRetries) {
          setRetrying(true);
          await new Promise((r) => setTimeout(r, backoff[attempt]));
        } else {
          setError(
            e instanceof Error ? e.message : "Connexion impossible. Réessayez."
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
      <JoinShell>
        <div
          role="alert"
          className="w-full max-w-md bg-white border border-line rounded-xl p-8 flex flex-col gap-5"
        >
          <p className="flex items-start gap-3 text-xl font-bold text-danger">
            <Icon name="info" size={24} className="mt-0.5" />
            {error}
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => joinTeam()} className="btn btn-primary px-6 py-3">
              Réessayer
            </button>
            <Link href="/" className="btn btn-secondary px-6 py-3">
              <Icon name="arrow-left" />
              Retour
            </Link>
          </div>
        </div>
      </JoinShell>
    );
  }

  return <JoinFallback retrying={retrying} />;
}

function JoinShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col bg-surface">
      <header className="bg-white border-b border-line">
        <BrandStripe />
        <div className="max-w-6xl mx-auto px-6 py-3">
          <BrandLogo height={40} priority />
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {children}
      </main>
    </div>
  );
}

function JoinFallback({ retrying = false }: { retrying?: boolean }) {
  return (
    <JoinShell>
      <div className="flex items-center gap-3">
        <Spinner size="md" />
        <p className="text-ink-2 text-xl" aria-live="polite">
          {retrying ? "Nouvelle tentative de connexion…" : "Connexion à votre équipe…"}
        </p>
      </div>
    </JoinShell>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinFallback />}>
      <JoinContent />
    </Suspense>
  );
}
