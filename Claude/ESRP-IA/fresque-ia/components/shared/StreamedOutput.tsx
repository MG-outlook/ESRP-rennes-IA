"use client";

import Skeleton from "@/components/shared/Skeleton";

interface StreamedOutputProps {
  content: string;
  loading?: boolean;
  retryMessage?: string;
  onRetry?: () => void;
}

export default function StreamedOutput({
  content,
  loading,
  retryMessage,
  onRetry,
}: StreamedOutputProps) {
  return (
    <div className="border-2 border-black p-6 bg-white min-h-[120px]">
      <div aria-live="polite" aria-atomic="false">
        {content ? (
          <p className="text-xl text-black whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        ) : loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <span className="text-[#B8B8B8] text-xl">
            La reponse apparaitra ici.
          </span>
        )}
      </div>
      {retryMessage && (
        <div className="mt-3" aria-live="polite">
          <p className="text-[#4A4A4A] text-sm">{retryMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-4 py-2 min-h-[44px] border-2 border-black text-black font-semibold text-sm"
            >
              Reessayer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
