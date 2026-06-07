interface SpinnerProps {
  size?: "sm" | "md";
}

export default function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <span
      className={`spinner spinner-${size}`}
      role="status"
      aria-label="Chargement"
    />
  );
}
