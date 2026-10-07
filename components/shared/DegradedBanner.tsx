"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/shared/Icon";
import { getAIStatus, onAIStatusChange, startHealthCheck } from "@/lib/ai/health";

export default function DegradedBanner() {
  const [status, setStatus] = useState(getAIStatus);

  useEffect(() => {
    startHealthCheck();
    return onAIStatusChange(setStatus);
  }, []);

  if (status === "ok") return null;

  return (
    <div
      role="status"
      className="bg-warning-soft text-warning border-b border-warning-line px-4 py-2.5 flex items-center justify-center gap-2 text-center font-bold"
    >
      <Icon name="alert" size={20} strokeWidth={2.4} />
      Mode dégradé : les réponses de l&apos;IA peuvent être plus lentes ou venir du cache.
    </div>
  );
}
