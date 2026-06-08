/**
 * Warm-up Edge Functions: pings each function to wake cold starts.
 *
 * Usage:
 *   pnpm tsx scripts/warmup-functions.ts
 *
 * Run 10-15 minutes before the workshop starts.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const FUNCTIONS = ["ai-proxy", "porte-chat"];

async function warmup(fnName: string): Promise<void> {
  const start = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        system_prompt: "Reply OK.",
        messages: [{ role: "user", content: "warmup ping" }],
        max_tokens: 5,
        health_check: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Date.now() - start;
    console.log(`  ${fnName}: ${res.ok ? "OK" : `WARN (${res.status})`} — ${ms}ms`);
  } catch (e) {
    const ms = Date.now() - start;
    console.log(`  ${fnName}: FAIL — ${ms}ms — ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  console.log("Warming up Edge Functions...\n");

  // Run 3 rounds to ensure warm
  for (let round = 1; round <= 3; round++) {
    console.log(`Round ${round}/3:`);
    await Promise.all(FUNCTIONS.map(warmup));
    if (round < 3) await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\nDone. Functions should be warm.");
}

main().catch(console.error);
