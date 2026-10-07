"use client";

import { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin/client";
import Spinner from "@/components/shared/Spinner";
import { useToast } from "@/lib/hooks/useToast";
import Icon from "@/components/shared/Icon";

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
  active_challenge_ids: number[];
}

interface ArchivedTeam {
  id: string;
  code: string;
  animator: string | null;
}

const CHALLENGES = [
  { id: 0, title: "La Porte" },
  { id: 1, title: "Pré-admission" },
  { id: 2, title: "Tri des observations" },
  { id: 3, title: "Mauvais prompts" },
  { id: 4, title: "Trois courriers" },
  { id: 5, title: "Notre projet" },
];

// Défis « généralistes » (track general) — sans lien avec Camille.
const GENERAL_CHALLENGES = [
  { id: 201, title: "A — Pictogramme" },
  { id: 202, title: "B — Client mystère" },
  { id: 203, title: "C — Chasse à l'hallu" },
  { id: 204, title: "D — Caméléon" },
  { id: 205, title: "E — Fabrique à idées" },
];

// Cas d'usage métier : mises en situation du quotidien professionnel.
const USECASE_CHALLENGES = [
  { id: 301, title: "1 — Mission documentaire" },
  { id: 302, title: "2 — Simulateur d'entretien" },
  { id: 303, title: "3 — Débrief vocal" },
  { id: 304, title: "4 — Synthèse copil" },
];

const ALL_MAIN = [...CHALLENGES, ...GENERAL_CHALLENGES, ...USECASE_CHALLENGES];

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
    active_challenge_ids: [],
  });
  const [archivedTeams, setArchivedTeams] = useState<ArchivedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [pauseReason, setPauseReason] = useState("");
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [bonusChallenge, setBonusChallenge] = useState(101);
  const [bonusTargets, setBonusTargets] = useState<Set<string>>(new Set());
  const [newCode, setNewCode] = useState("");
  const [newAnimator, setNewAnimator] = useState("");
  const [busyTeam, setBusyTeam] = useState<string | null>(null);

  const { show: showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const { teams, archived_teams, workshop_state } = await adminFetch<{
        teams: Team[];
        archived_teams: ArchivedTeam[];
        workshop_state: WorkshopState;
      }>("get_state");
      setTeams(teams);
      setArchivedTeams(archived_teams ?? []);
      // Fall back to the legacy single field if the open set is empty, so the
      // UI is correct even on rows written before the multi-open migration.
      const ids =
        workshop_state.active_challenge_ids?.length
          ? workshop_state.active_challenge_ids
          : workshop_state.active_challenge_id != null
            ? [workshop_state.active_challenge_id]
            : [];
      setWorkshopState({ ...workshop_state, active_challenge_ids: ids });
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminAction("create_team", {
        code: newCode.trim(),
        animator: newAnimator.trim() || null,
      });
      showToast(`Équipe ${newCode.trim()} créée`, "success");
      setNewCode("");
      setNewAnimator("");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  async function handleResetTeam(team: Team) {
    if (
      !window.confirm(
        `Réinitialiser l'équipe ${team.code} ? Toute sa progression et ses documents seront effacés. Cette action est irréversible.`
      )
    )
      return;
    setBusyTeam(team.id);
    try {
      await adminAction("reset_team", { team_id: team.id });
      showToast(`Équipe ${team.code} réinitialisée`, "success");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
    setBusyTeam(null);
  }

  async function handleArchiveTeam(team: Team) {
    if (!window.confirm(`Archiver l'équipe ${team.code} ?`)) return;
    setBusyTeam(team.id);
    try {
      await adminAction("archive_team", { team_id: team.id });
      showToast(`Équipe ${team.code} archivée`, "info");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
    setBusyTeam(null);
  }

  async function handleRestoreTeam(team: ArchivedTeam) {
    try {
      await adminAction("restore_team", { team_id: team.id });
      showToast(`Équipe ${team.code} restaurée`, "success");
      fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

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

  // Open set: the challenges currently open to teams. Several can be open at
  // once; when more than one is open, teams choose from a menu in the lobby.
  const openIds = new Set(workshopState.active_challenge_ids ?? []);

  async function setOpenChallenges(ids: number[]) {
    const sorted = [...new Set(ids)].sort((a, b) => a - b);
    // Optimistic update so toggles feel instant despite the 4s poll.
    setWorkshopState((prev) => ({
      ...prev,
      active_challenge_ids: sorted,
      active_challenge_id: sorted.length === 1 ? sorted[0] : null,
    }));
    try {
      await adminAction("set_open_challenges", { challenge_ids: sorted });
    } catch (e) {
      showToast((e as Error).message, "error");
      fetchData();
    }
  }

  function handleToggleChallenge(challengeId: number) {
    const next = new Set(openIds);
    if (next.has(challengeId)) next.delete(challengeId);
    else next.add(challengeId);
    setOpenChallenges([...next]);
  }

  function handleOpenMany(ids: number[]) {
    setOpenChallenges([...new Set([...openIds, ...ids])]);
  }

  function handleCloseMany(ids: number[]) {
    const remove = new Set(ids);
    setOpenChallenges([...openIds].filter((id) => !remove.has(id)));
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
      <main className="flex items-center justify-center flex-1 bg-white">
        <p className="text-ink-2">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl">
      <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-6 sm:mb-8">
        Panneau de contrôle
      </h1>

      {/* Pause globale */}
      <section className="border p-4 sm:p-6 mb-6 sm:mb-8 border-line">
        <h2 className="text-2xl font-bold text-ink mb-4">Pause globale</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <input
            type="text"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Raison de la pause (optionnel)..."
            disabled={workshopState.is_paused}
            className="field flex-1 px-4 py-3 disabled:opacity-50"
          />
          <button
            onClick={handlePauseToggle}
            className={`btn px-6 py-3 font-semibold border-2 text-xl shrink-0 ${
              workshopState.is_paused
                ? "bg-success border-success text-white"
                : "bg-danger border-danger text-white"
            }`}
          >
            {workshopState.is_paused ? "Reprendre" : "Pause"}
          </button>
        </div>
        {workshopState.is_paused && workshopState.pause_reason && (
          <p className="mt-2 text-danger font-semibold">
            En pause : {workshopState.pause_reason}
          </p>
        )}
      </section>

      {/* Défis ouverts — plusieurs défis peuvent être ouverts à la fois */}
      <section className="border p-4 sm:p-6 mb-6 sm:mb-8 border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-ink">Défis ouverts</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenMany(ALL_MAIN.map((c) => c.id))}
              className="btn btn-primary px-3 py-2 text-sm "
            >
              Ouvrir tous les défis
            </button>
            <button
              onClick={() => handleCloseMany(ALL_MAIN.map((c) => c.id))}
              disabled={openIds.size === 0}
              className="px-3 py-2 border-2 border-danger text-danger text-sm font-semibold disabled:opacity-40"
            >
              Tout fermer
            </button>
          </div>
        </div>

        <p className="text-sm text-ink-2 mb-4">
          Cochez un ou plusieurs défis. Quand plusieurs défis sont ouverts, chaque
          équipe choisit le sien depuis la salle d&apos;attente.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parcours Camille */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="font-bold text-ink">Parcours Camille</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenMany(CHALLENGES.map((c) => c.id))}
                  className="text-sm text-brand underline"
                >
                  Tout ouvrir
                </button>
                <button
                  onClick={() => handleCloseMany(CHALLENGES.map((c) => c.id))}
                  className="text-sm text-danger underline"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CHALLENGES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleToggleChallenge(c.id)}
                  aria-pressed={openIds.has(c.id)}
                  className={`btn flex items-center gap-2 px-4 py-2 border-2 font-semibold ${
                    openIds.has(c.id)
                      ? "bg-brand border-brand text-white"
                      : "bg-white border-control text-ink"
                  }`}
                >
                  <Icon name={openIds.has(c.id) ? "check-square" : "square"} />
                  <span>
                    {c.id}. {c.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Défis généralistes */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="font-bold text-ink">Défis généralistes</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenMany(GENERAL_CHALLENGES.map((c) => c.id))}
                  className="text-sm text-brand underline"
                >
                  Tout ouvrir
                </button>
                <button
                  onClick={() => handleCloseMany(GENERAL_CHALLENGES.map((c) => c.id))}
                  className="text-sm text-danger underline"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENERAL_CHALLENGES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleToggleChallenge(c.id)}
                  aria-pressed={openIds.has(c.id)}
                  className={`btn flex items-center gap-2 px-4 py-2 border-2 font-semibold text-left ${
                    openIds.has(c.id)
                      ? "bg-brand border-brand text-white"
                      : "bg-white border-brand text-brand"
                  }`}
                >
                  <Icon name={openIds.has(c.id) ? "check-square" : "square"} />
                  <span>{c.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cas d'usage métier */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="font-bold text-ink">Cas d&apos;usage métier</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenMany(USECASE_CHALLENGES.map((c) => c.id))}
                  className="text-sm text-brand underline"
                >
                  Tout ouvrir
                </button>
                <button
                  onClick={() => handleCloseMany(USECASE_CHALLENGES.map((c) => c.id))}
                  className="text-sm text-danger underline"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {USECASE_CHALLENGES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleToggleChallenge(c.id)}
                  aria-pressed={openIds.has(c.id)}
                  className={`btn flex items-center gap-2 px-4 py-2 border-2 font-semibold text-left ${
                    openIds.has(c.id)
                      ? "bg-brand border-brand text-white"
                      : "bg-white border-control text-ink"
                  }`}
                >
                  <Icon name={openIds.has(c.id) ? "check-square" : "square"} />
                  <span>{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-ink-2 mt-4">
          Ouverts :{" "}
          {openIds.size > 0 ? (
            <span className="font-semibold text-ink">
              {[...openIds]
                .sort((a, b) => a - b)
                .map(
                  (id) => ALL_MAIN.find((c) => c.id === id)?.title ?? `#${id}`
                )
                .join(" · ")}
            </span>
          ) : (
            "Aucun"
          )}
        </p>
      </section>

      {/* Équipes */}
      <section className="border p-4 sm:p-6 mb-6 sm:mb-8 border-line">
        <h2 className="text-2xl font-bold text-ink mb-4">Équipes</h2>

        {/* Créer une équipe */}
        <form
          onSubmit={handleCreateTeam}
          className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6 border-2 border-line p-3"
        >
          <label className="flex flex-col text-sm font-semibold text-ink">
            Code (4 chiffres)
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="ex : 7421"
              className="field mt-1 px-3 py-2 w-full sm:w-32"
            />
          </label>
          <label className="flex flex-col text-sm font-semibold text-ink flex-1">
            Animateur (optionnel)
            <input
              type="text"
              value={newAnimator}
              onChange={(e) => setNewAnimator(e.target.value)}
              placeholder="ex : Réjane"
              className="field mt-1 px-3 py-2 "
            />
          </label>
          <button
            type="submit"
            disabled={!/^\d{4}$/.test(newCode.trim())}
            className="btn btn-primary px-5 py-2 disabled:opacity-50 shrink-0"
          >
            + Ajouter
          </button>
        </form>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="p-3">Code</th>
              <th scope="col" className="p-3">Animateur</th>
              <th scope="col" className="p-3">Mot de passe</th>
              <th scope="col" className="p-3">Statut</th>
              <th scope="col" className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-line">
                <td className="p-3 font-bold text-xl">{team.code}</td>
                <td className="p-3 text-ink-2 capitalize">{team.animator}</td>
                <td className="p-3 text-brand font-semibold">
                  {team.password ?? "—"}
                </td>
                <td className="p-3">
                  {team.porte_passed_at ? (
                    <span className="text-brand font-semibold">Passé</span>
                  ) : (
                    <span className="text-danger">En attente</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {!team.porte_passed_at && (
                      <button
                        onClick={() => handleUnlock(team.id)}
                        disabled={unlocking === team.id}
                        className="px-3 py-2 bg-danger text-white text-sm font-semibold border-2 border-danger disabled:opacity-50"
                      >
                        {unlocking === team.id ? <Spinner size="sm" /> : "Débloquer"}
                      </button>
                    )}
                    <button
                      onClick={() => handleResetTeam(team)}
                      disabled={busyTeam === team.id}
                      className="px-3 py-2 bg-white text-danger text-sm font-semibold border-2 border-danger disabled:opacity-50"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => handleArchiveTeam(team)}
                      disabled={busyTeam === team.id}
                      className="px-3 py-2 bg-white text-ink-2 text-sm font-semibold border-2 border-line disabled:opacity-50"
                    >
                      Archiver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Équipes archivées */}
        {archivedTeams.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer font-semibold text-ink-2">
              Équipes archivées ({archivedTeams.length})
            </summary>
            <div className="flex flex-wrap gap-2 mt-3">
              {archivedTeams.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 border-2 border-line px-3 py-2"
                >
                  <span className="font-bold text-ink">{t.code}</span>
                  {t.animator && (
                    <span className="text-sm text-ink-2 capitalize">
                      {t.animator}
                    </span>
                  )}
                  <button
                    onClick={() => handleRestoreTeam(t)}
                    className="text-sm text-brand underline"
                  >
                    Restaurer
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* Bonus activation */}
      <section className="border p-4 sm:p-6 border-line">
        <h2 className="text-2xl font-bold text-ink mb-4">Activer un bonus</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {BONUS_CHALLENGES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBonusChallenge(b.id)}
              className={`btn px-3 py-1 border-2 text-sm font-semibold ${
                bonusChallenge === b.id
                  ? "bg-brand border-brand text-white"
                  : "bg-white border-control text-ink-2"
              }`}
            >
              {b.title}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-ink">Équipes cibles :</span>
            <button
              onClick={selectAllBonusTargets}
              className="text-sm text-brand underline"
            >
              Toutes
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleBonusTarget(t.id)}
                className={`btn px-3 py-1 border-2 text-sm font-semibold ${
                  bonusTargets.has(t.id)
                    ? "bg-brand border-brand text-white"
                    : "bg-white border-control text-ink-2"
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
          className="btn btn-primary px-6 py-3 disabled:opacity-50"
        >
          Activer pour {bonusTargets.size} équipe{bonusTargets.size > 1 ? "s" : ""}
        </button>
      </section>
      </div>
    </main>
  );
}
