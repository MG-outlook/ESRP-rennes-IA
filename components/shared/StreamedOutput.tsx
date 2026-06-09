"use client";

import Spinner from "@/components/shared/Spinner";
import Markdown from "@/components/shared/Markdown";

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
          <>
            <Markdown content={content} />
            {loading && (
              <span className="inline-flex items-center gap-2 text-[#4A4A4A] mt-2">
                <Spinner size="sm" />
                <span className="text-sm">L&apos;IA continue d&apos;écrire…</span>
              </span>
            )}
          </>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-[#4A4A4A]">
            <Spinner size="lg" />
            <p className="text-lg font-semibold">L&apos;IA travaille…</p>
            <p className="text-sm text-[#B8B8B8]">
              Elle lit le dossier et rédige sa réponse, cela prend quelques secondes.
            </p>
          </div>
        ) : (
          <span className="text-[#B8B8B8] text-xl">
            La réponse apparaîtra ici.
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
              Réessayer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
