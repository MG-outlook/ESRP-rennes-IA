"use client";

import { useState } from "react";
import type { Composition, Role, RoleHint } from "@/lib/roles/adapter";

const ROLES: Role[] = ["admin", "medico_psy", "formateur", "insertion_pro"];
const ROLE_LABELS: Record<Role, string> = {
  admin: "Administratif",
  medico_psy: "Médico-psy-social",
  formateur: "Formation",
  insertion_pro: "Insertion pro",
};

interface TurnByTurnPanelProps {
  composition?: Composition | null;
  roleHints?: Record<Role, RoleHint> | null;
  onAllContributed?: (contributions: Record<Role, string>) => void;
}

export default function TurnByTurnPanel({
  composition,
  roleHints,
  onAllContributed,
}: TurnByTurnPanelProps) {
  const [contributions, setContributions] = useState<Record<Role, string>>({
    admin: "",
    medico_psy: "",
    formateur: "",
    insertion_pro: "",
  });

  const activeRoles = ROLES.filter((role) => (composition?.[role] ?? 1) > 0);
  const canSubmit = activeRoles.every((role) => contributions[role].trim().length > 0);

  return (
    <section className="border-2 border-black p-4 bg-white">
      <h2 className="mb-3">Contributions par métier</h2>
      <div className="space-y-4">
        {activeRoles.map((role) => (
          <label key={role} className="block">
            <span className="font-bold text-black">{ROLE_LABELS[role]}</span>
            {roleHints?.[role]?.hint && (
              <span className="block text-sm text-[#4A4A4A] mb-2">
                {roleHints[role].hint}
              </span>
            )}
            <textarea
              value={contributions[role]}
              onChange={(event) =>
                setContributions((previous) => ({
                  ...previous,
                  [role]: event.target.value,
                }))
              }
              className="w-full min-h-24 border-2 border-black p-3 bg-white text-black"
              placeholder="Notez la contribution de ce métier..."
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onAllContributed?.(contributions)}
        className="mt-4 px-4 py-2 border-2 border-[#2D5A3D] bg-[#2D5A3D] text-white font-semibold disabled:opacity-50"
      >
        Valider les contributions
      </button>
    </section>
  );
}
