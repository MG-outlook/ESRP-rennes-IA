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
    <div className="border p-6 bg-white min-h-[120px] border-line">
      <div aria-live="polite" aria-atomic="false">
        {content ? (
          <>
            <Markdown content={content} />
            {loading && (
              <span className="inline-flex items-center gap-2 text-ink-2 mt-2">
                <Spinner size="sm" />
                <span className="text-sm">L&apos;IA continue d&apos;écrire…</span>
              </span>
            )}
          </>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-ink-2">
            <Spinner size="lg" />
            <p className="text-lg font-semibold">L&apos;IA travaille…</p>
            <p className="text-sm text-muted">
              Elle lit le dossier et rédige sa réponse, cela prend quelques secondes.
            </p>
          </div>
        ) : (
          <span className="text-muted text-xl">
            La réponse apparaîtra ici.
          </span>
        )}
      </div>
      {retryMessage && (
        <div className="mt-3" aria-live="polite">
          <p className="text-ink-2 text-sm">{retryMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-secondary mt-2 px-4 py-2 min-h-[44px] text-sm"
            >
              Réessayer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
