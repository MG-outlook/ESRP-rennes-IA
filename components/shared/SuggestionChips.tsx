"use client";

// Suggestions cliquables pour amorcer un champ de saisie : l'équipe part de
// matière réelle (faits du dossier, exemples métier) qu'elle adapte, au lieu
// de devoir tout inventer.

interface SuggestionChipsProps {
  label?: string;
  suggestions: string[];
  onPick: (suggestion: string) => void;
  disabled?: boolean;
}

export default function SuggestionChips({
  label = "Besoin d'inspiration ? Cliquez pour reprendre, puis adaptez :",
  suggestions,
  onPick,
  disabled = false,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-sm text-[#4A4A4A] mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            disabled={disabled}
            className="px-3 py-1.5 border-2 border-[#B8B8B8] text-sm text-[#4A4A4A] text-left bg-white hover:border-[#2D5A3D] hover:text-[#2D5A3D] disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
