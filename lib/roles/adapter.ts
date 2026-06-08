export type Role = "admin" | "medico_psy" | "formateur" | "insertion_pro";
export type Composition = Partial<Record<Role, number>>;
export type RoleHint = { mode: "present" | "absent"; hint: string };

const HINTS: Record<Role, string> = {
  admin: "Regard administratif : pièces, échéances, traçabilité et clarté du dossier.",
  medico_psy: "Regard médico-psy-social : besoins, compensations, fatigue et points de vigilance.",
  formateur: "Regard formation : compétences, progression pédagogique et adaptations concrètes.",
  insertion_pro: "Regard insertion professionnelle : projet métier, stage, employeur et faisabilité terrain.",
};

export function getRoleHints(
  composition?: Composition | null,
  _context?: string
): Record<Role, RoleHint> {
  return (Object.keys(HINTS) as Role[]).reduce((acc, role) => {
    const count = composition?.[role] ?? 0;
    acc[role] = {
      mode: count > 0 ? "present" : "absent",
      hint: HINTS[role],
    };
    return acc;
  }, {} as Record<Role, RoleHint>);
}
