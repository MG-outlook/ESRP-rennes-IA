"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin/client";
import Spinner from "@/components/shared/Spinner";
import { useToast } from "@/lib/hooks/useToast";

interface Team {
  id: string;
  code: string;
  password: string | null;
  animator: string | null;
  composition: Record<string, number> | null;
  porte_passed_at: string | null;
}

interface WorkshopState {
  is_paused: boolean;
  pause_reason: string | null;
  active_challenge_id: number | null;
}

const CHALLENGES = [
  { id: 0, title: "La Porte" },
  { id: 1, title: "Pré-admission" },
  { id: 2, title: "Synthèse 4 voix" },
  { id: 3, title: "Mauvais prompts" },
  { id: 4, title: "5 destinataires" },
  { id: 5, title: "Notre projet" },
];

const BONUS_CHALLENGES = [
  { id: 101, title: "Doublons" },
  { id: 102, title: "Coach entretien" },
  { id: 103, title: "RAPO" },
  { id: 104, title: "Subvention" },
  { id: 105, title: "Vrai/Faux IA" },
  { id: 106, title: "Journal" },
  { id: 107, title: "Pitch vocal" },
  { id: 108, title: "Crise" },
  { id: 109, title: "Glossaire" },
  { id: 110, title: "Carte mentale" },
];

const adminAction = adminFetch;

export default function ControlPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [workshopState, setWorkshopState] = useState<WorkshopState>({
    is_paused: false,
    pause_reason: null,
    active_challenge_id: null,
  });
  const [loading, setLoading] = useState(true);
  const [pauseReason, setPauseReason] = useState("");
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [bonusChallenge, setBonusChallenge] = useState(101);
  const [bonusTargets, setBonusTargets] = useState<Set<string>>(new Set());

  const { show: showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const { teams, workshop_state } = await adminFetch<{
        teams: Team[];
        workshop_state: WorkshopState;
      }>("get_state");
      setTeams(teams);
      setWorkshopState(workshop_state);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handlePauseToggle() {
    if (workshopState.is_paused) {
      await adminAction("resume");
      showToast("Reprise", "info");
    } else {
      await adminAction("pause", { reason: pauseReason || null });
      showToast("Pause activee", "info");
    }
  }

  async function handleSetChallenge(challengeId: number) {
    await adminAction("set_active_challenge", { challenge_id: challengeId });
    showToast(`Defi ${challengeId} active`, "success");
  }

  async function handleUnlock(teamId: string) {
    setUnlocking(teamId);
    const words = ["Courage", "Avenir", "Equipe", "Confiance", "Lumiere", "Horizon", "Chemin", "Etoile", "Force", "Espoir"];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    const password = `${pick()}-${pick()}-${pick()}`;
    const composition = { admin: 1, medico_psy: 1, formateur: 2, insertion_pro: 2, autre: 0 };

    try {
      const team = teams.find((t) => t.id === teamId);
      await adminAction("unlock_team", { team_id: teamId, password, composition });
      showToast(`Equipe ${team?.code ?? teamId} debloquee`, "success");
    } catch (e) {
      alert(`Erreur : ${(e as Error).message}`);
    }
    setUnlocking(null);
  }

  function toggleBonusTarget(teamId: string) {
    setBonusTargets((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  function selectAllBonusTargets() {
    setBonusTargets(new Set(teams.map((t) => t.id)));
  }

  async function handleActivateBonus() {
    if (bonusTargets.size === 0) return;
    const count = bonusTargets.size;
    await adminAction("activate_bonus", {
      challenge_id: bonusChallenge,
      team_ids: [...bonusTargets],
    });
    setBonusTargets(new Set());
    showToast(`Bonus active pour ${count} equipes`, "success");
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-[#4A4A4A]">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold text-black mb-8">Panneau de contrôle</h1>

      {/* Pause globale */}
      <section className="border-2 border-black p-6 mb-8">
        <h2 className="text-2xl font-bold text-black mb-4">Pause globale</h2>
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Raison de la pause (optionnel)..."
            disabled={workshopState.is_paused}
            className="flex-1 border-2 border-black px-4 py-3 text-black focus:border-[#2D5A3D] focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handlePauseToggle}
            className={`px-6 py-3 font-semibold border-2 text-xl ${
              workshopState.is_paused
                ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                : "bg-[#8B3A3A] border-[#8B3A3A] text-white"
            }`}
          >
            {workshopState.is_paused ? "▶ Reprendre" : "⏸ Pause"}
          </button>
        </div>
        {workshopState.is_paused && workshopState.pause_reason && (
          <p className="mt-2 text-[#8B3A3A] font-semibold">
            En pause : {workshopState.pause_reason}
          </p>
        )}
      </section>

      {/* Défi actif */}
      <section className="border-2 border-black p-6 mb-8">
        <h2 className="text-2xl font-bold text-black mb-4">Défi actif</h2>
        <div className="flex flex-wrap gap-2">
          {CHALLENGES.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSetChallenge(c.id)}
              className={`px-4 py-2 border-2 font-semibold ${
                workshopState.active_challenge_id === c.id
                  ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                  : "bg-white border-black text-black"
              }`}
            >
              {c.id}. {c.title}
            </button>
          ))}
        </div>
        <p className="text-sm text-[#4A4A4A] mt-2">
          Actif : {workshopState.active_challenge_id !== null
            ? CHALLENGES.find((c) => c.id === workshopState.active_challenge_id)?.title ?? `#${workshopState.active_challenge_id}`
            : "Aucun"}
        </p>
      </section>

      {/* Équipes */}
      <section className="border-2 border-black p-6 mb-8">
        <h2 className="text-2xl font-bold text-black mb-4">Équipes</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th scope="col" className="p-3">Code</th>
              <th scope="col" className="p-3">Animateur</th>
              <th scope="col" className="p-3">Mot de passe</th>
              <th scope="col" className="p-3">Statut</th>
              <th scope="col" className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-[#B8B8B8]">
                <td className="p-3 font-bold text-xl">{team.code}</td>
                <td className="p-3 text-[#4A4A4A] capitalize">{team.animator}</td>
                <td className="p-3 text-[#2D5A3D] font-semibold">
                  {team.password ?? "—"}
                </td>
                <td className="p-3">
                  {team.porte_passed_at ? (
                    <span className="text-[#2D5A3D] font-semibold">Passé</span>
                  ) : (
                    <span className="text-[#8B3A3A]">En attente</span>
                  )}
                </td>
                <td className="p-3">
                  {!team.porte_passed_at && (
                    <button
                      onClick={() => handleUnlock(team.id)}
                      disabled={unlocking === team.id}
                      className="px-4 py-2 bg-[#8B3A3A] text-white font-semibold border-2 border-[#8B3A3A] disabled:opacity-50"
                    >
                      {unlocking === team.id ? <Spinner size="sm" /> : "Débloquer"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {/* Bonus activation */}
      <section className="border-2 border-black p-6">
        <h2 className="text-2xl font-bold text-black mb-4">Activer un bonus</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {BONUS_CHALLENGES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBonusChallenge(b.id)}
              className={`px-3 py-1 border-2 text-sm font-semibold ${
                bonusChallenge === b.id
                  ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                  : "bg-white border-[#B8B8B8] text-[#4A4A4A]"
              }`}
            >
              {b.title}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-black">Équipes cibles :</span>
            <button
              onClick={selectAllBonusTargets}
              className="text-sm text-[#2D5A3D] underline"
            >
              Toutes
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleBonusTarget(t.id)}
                className={`px-3 py-1 border-2 text-sm font-semibold ${
                  bonusTargets.has(t.id)
                    ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                    : "bg-white border-[#B8B8B8] text-[#4A4A4A]"
                }`}
              >
                {t.code}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleActivateBonus}
          disabled={bonusTargets.size === 0}
          className="px-6 py-3 bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
        >
          Activer pour {bonusTargets.size} équipe{bonusTargets.size > 1 ? "s" : ""}
        </button>
      </section>
    </main>
  );
}
