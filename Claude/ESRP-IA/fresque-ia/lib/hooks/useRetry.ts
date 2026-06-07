"use client";

import { useState, useCallback, useRef } from "react";

interface RetryOptions {
  maxRetries?: number;
  backoff?: number[];
}

interface RetryState<T> {
  execute: () => Promise<T | undefined>;
  isRetrying: boolean;
  retryCount: number;
  error: Error | null;
  reset: () => void;
}

export function useRetry<T>(
  asyncFn: () => Promise<T>,
  options?: RetryOptions
): RetryState<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const backoff = options?.backoff ?? [1000, 2000, 4000];

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsRetrying(false);
    setRetryCount(0);
    setError(null);
  }, []);

  const execute = useCallback(async (): Promise<T | undefined> => {
    abortRef.current = false;
    setError(null);
    setRetryCount(0);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (abortRef.current) return undefined;

      try {
        const result = await asyncFn();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));

        if (attempt < maxRetries) {
          setIsRetrying(true);
          setRetryCount(attempt + 1);
          const delay = backoff[Math.min(attempt, backoff.length - 1)];
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          setIsRetrying(false);
          setError(err);
          return undefined;
        }
      }
    }
    return undefined;
  }, [asyncFn, maxRetries, backoff]);

  return { execute, isRetrying, retryCount, error, reset };
}
