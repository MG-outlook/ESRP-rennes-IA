let lastStatus: "ok" | "degraded" = "ok";
let listeners: Array<(status: "ok" | "degraded") => void> = [];

export function getAIStatus() {
  return lastStatus;
}

export function onAIStatusChange(cb: (status: "ok" | "degraded") => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function notify(status: "ok" | "degraded") {
  if (status !== lastStatus) {
    lastStatus = status;
    for (const cb of listeners) cb(status);
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startHealthCheck(intervalMs = 30_000) {
  if (intervalId) return;

  async function ping() {
    try {
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          system_prompt: "Reply OK.",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
          health_check: true,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      notify(res.ok ? "ok" : "degraded");
    } catch {
      notify("degraded");
    }
  }

  ping();
  intervalId = setInterval(ping, intervalMs);
}

export function stopHealthCheck() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
