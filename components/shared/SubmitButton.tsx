"use client";

import Spinner from "@/components/shared/Spinner";

interface SubmitButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  state: "idle" | "loading" | "done";
  label?: string;
}

export default function SubmitButton({
  onClick,
  disabled,
  state,
  label = "Valider",
}: SubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || state === "loading" || state === "done"}
      aria-busy={state === "loading"}
      className={`px-6 py-3 min-h-[44px] text-xl font-semibold border-2 transition-opacity ${
        state === "done"
          ? "bg-[#5B8C6B] border-[#5B8C6B] text-white"
          : "bg-[#2D5A3D] border-[#2D5A3D] text-white"
      } disabled:opacity-50`}
    >
      {state === "loading" ? (
        <span className="inline-flex items-center gap-2">
          <Spinner size="sm" />
          <span>{label}</span>
        </span>
      ) : state === "done" ? (
        "Envoye"
      ) : (
        label
      )}
    </button>
  );
}
