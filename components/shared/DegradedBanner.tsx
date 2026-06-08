"use client";

import { useEffect, useState } from "react";
import { getAIStatus, onAIStatusChange, startHealthCheck } from "@/lib/ai/health";

export default function DegradedBanner() {
  const [status, setStatus] = useState(getAIStatus);

  useEffect(() => {
    startHealthCheck();
    return onAIStatusChange(setStatus);
  }, []);

  if (status === "ok") return null;

  return (
    <div className="bg-black text-white text-center py-2 text-sm font-semibold">
      Mode dégradé — les réponses IA peuvent être plus lentes ou provenir du cache
    </div>
  );
}
