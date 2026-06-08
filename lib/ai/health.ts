import { createClient } from "@/lib/supabase/client";

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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            system_prompt: "Reply OK.",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
            health_check: true,
          }),
          signal: AbortSignal.timeout(10_000),
        }
      );
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
