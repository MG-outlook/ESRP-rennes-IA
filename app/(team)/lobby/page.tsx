"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { challengeTitle } from "@/lib/scoring";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Spinner from "@/components/shared/Spinner";

export default function LobbyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // Challenges that are open AND not yet finished by this team.
  const [available, setAvailable] = useState<number[]>([]);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: session } = await supabase
      .from("team_sessions")
      .select("team_id")
      .eq("auth_uid", user.id)
      .maybeSingle();
    const teamId = session?.team_id ?? null;
    if (!teamId) {
      setLoading(false);
      return;
    }

    const [{ data: state }, { data: progress }] = await Promise.all([
      supabase
        .from("workshop_state")
        .select("active_challenge_id, active_challenge_ids")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("team_progress")
        .select("challenge_id, finished_at")
        .eq("team_id", teamId),
    ]);

    const openIds: number[] = (
      state?.active_challenge_ids?.length
        ? state.active_challenge_ids
        : state?.active_challenge_id != null
          ? [state.active_challenge_id]
          : []
    ).filter((id: number) => id > 0);

    const finished = new Set(
      (progress ?? [])
        .filter((p) => p.finished_at !== null)
        .map((p) => p.challenge_id)
    );

    setAvailable(openIds.filter((id) => !finished.has(id)).sort((a, b) => a - b));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  // With 0 or 1 open challenge, ChallengeNavigator handles routing; this page
  // only ever shows the waiting room. The menu appears when several challenges
  // are open at once and the team gets to choose.
  const showMenu = available.length > 1;

  if (showMenu) {
    return (
      <main
        className="min-h-screen bg-white px-6 py-12"
        aria-label="Choix du défi"
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="font-bold text-black mb-2 text-3xl">Choisissez votre défi</h1>
          <p className="text-[#4A4A4A] text-lg mb-8">
            Plusieurs défis sont ouverts. À vous de choisir lequel relever
            maintenant — vous pourrez faire les autres ensuite.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {available.map((id) => {
              const objective = CHALLENGE_INTROS[id]?.objective;
              return (
                <button
                  key={id}
                  onClick={() => router.push(`/challenge/${id}`)}
                  className="text-left border-2 border-black p-5 hover:border-[#2D5A3D] hover:bg-[#F0F5F1] transition-colors"
                >
                  <span className="block text-xl font-bold text-black">
                    {challengeTitle(id)}
                  </span>
                  {objective && (
                    <span className="block text-sm text-[#4A4A4A] mt-2">
                      🎯 {objective}
                    </span>
                  )}
                  <span className="inline-block mt-3 text-sm font-semibold text-[#2D5A3D]">
                    Commencer →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen p-8 bg-white text-center"
      aria-label="Salle d'attente"
    >
      <h1 className="font-bold text-black mb-4 text-3xl">En attente du prochain défi</h1>
      <p className="text-[#4A4A4A] text-lg max-w-md" aria-live="polite">
        Demandez aux animateurs d&apos;ouvrir le prochain défi si besoin.
      </p>
      <div className="mt-8 flex gap-2" aria-hidden>
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <>
            <span className="w-3 h-3 bg-[#2D5A3D] animate-pulse" />
            <span className="w-3 h-3 bg-[#2D5A3D] animate-pulse [animation-delay:150ms]" />
            <span className="w-3 h-3 bg-[#2D5A3D] animate-pulse [animation-delay:300ms]" />
          </>
        )}
      </div>
    </main>
  );
}
