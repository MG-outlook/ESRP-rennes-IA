"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { challengeTitle } from "@/lib/scoring";
import { CHALLENGE_INTROS } from "@/lib/challenges/intros";
import Spinner from "@/components/shared/Spinner";
import Icon from "@/components/shared/Icon";

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
      <main className="flex-1 bg-surface px-6 py-12 sm:py-14" aria-label="Choix du défi">
        <div className="max-w-6xl mx-auto flex flex-col gap-9">
          <div className="flex flex-col gap-2.5 max-w-3xl">
            <h1 className="text-4xl">Choisissez votre défi</h1>
            <p className="text-ink-2 text-lg">
              Plusieurs défis sont ouverts. Commencez par celui qui vous parle :
              vous pourrez faire les autres ensuite.
            </p>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-5">
            {available.map((id) => {
              const intro = CHALLENGE_INTROS[id];
              const [kicker, ...rest] = challengeTitle(id).split(" — ");
              const name = rest.join(" — ") || kicker;
              return (
                <li key={id}>
                  <button
                    onClick={() => router.push(`/challenge/${id}`)}
                    className="group w-full h-full text-left flex flex-col gap-3.5 p-7 bg-white border border-line rounded-xl transition-[border-color,box-shadow] hover:border-brand hover:shadow-md"
                  >
                    <span className="flex justify-between items-center gap-3 text-[0.85rem]">
                      <span className="font-bold text-brand">
                        {rest.length ? kicker : id < 100 ? `Défi ${id}` : "Défi"}
                      </span>
                      {intro?.duration && (
                        <span className="inline-flex items-center gap-1.5 text-ink-2">
                          <Icon name="clock" size={16} />
                          {intro.duration}
                        </span>
                      )}
                    </span>
                    <span className="text-2xl font-extrabold leading-tight">{name}</span>
                    {intro?.objective && (
                      <span className="text-ink-2">{intro.objective}</span>
                    )}
                    <span className="mt-auto pt-2 inline-flex items-center gap-2 font-bold text-brand group-hover:underline">
                      Commencer
                      <Icon name="arrow-right" size={18} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-surface text-center"
      aria-label="Salle d'attente"
    >
      <div className="w-full max-w-lg bg-white border border-line rounded-xl px-8 py-10 flex flex-col items-center gap-4">
        <h1 className="text-3xl">En attente du prochain défi</h1>
        <p className="text-ink-2 text-lg" aria-live="polite">
          L&apos;animation va ouvrir le prochain défi. Cette page se met à jour
          toute seule.
        </p>
        <div className="mt-2 flex gap-2" aria-hidden>
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-sky animate-pulse [animation-delay:150ms]" />
              <span className="w-2.5 h-2.5 rounded-full bg-leaf animate-pulse [animation-delay:300ms]" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
