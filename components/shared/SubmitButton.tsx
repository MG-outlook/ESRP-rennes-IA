"use client";

import Spinner from "@/components/shared/Spinner";
import Icon from "@/components/shared/Icon";

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
      className={`btn px-6 py-3 text-xl ${
        state === "done"
          ? "bg-success-soft border-success text-success-strong disabled:opacity-100"
          : "btn-primary"
      }`}
    >
      {state === "loading" ? (
        <>
          <Spinner size="sm" />
          <span>{label}</span>
        </>
      ) : state === "done" ? (
        <>
          <Icon name="check" strokeWidth={3} />
          Envoyé
        </>
      ) : (
        label
      )}
    </button>
  );
}
