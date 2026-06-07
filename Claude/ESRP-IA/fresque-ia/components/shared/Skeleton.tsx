interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[#F5F5F5] ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  );
}
