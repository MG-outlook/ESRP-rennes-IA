/**
 * Load test script: simulates 10 teams × 6 users hitting the AI proxy concurrently.
 *
 * Usage:
 *   pnpm tsx scripts/load-test.ts [--teams 10] [--users-per-team 6] [--duration 60]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function getArg(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? Number(args[idx + 1]) : defaultVal;
}

const TEAMS = getArg("teams", 10);
const USERS_PER_TEAM = getArg("users-per-team", 6);
const DURATION_SEC = getArg("duration", 60);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

interface RequestResult {
  userId: string;
  latencyMs: number;
  ttfbMs: number;
  success: boolean;
  error?: string;
}

const results: RequestResult[] = [];

// ---------------------------------------------------------------------------
// Simulate one AI proxy call
// ---------------------------------------------------------------------------

async function simulateRequest(userId: string): Promise<RequestResult> {
  const start = Date.now();
  let ttfb = 0;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        system_prompt: "Tu es un assistant de test. Réponds en une phrase.",
        messages: [{ role: "user", content: `Test de charge utilisateur ${userId}. Dis bonjour.` }],
        max_tokens: 50,
        challenge_id: 0,
        team_id: userId,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return { userId, latencyMs: Date.now() - start, ttfbMs: 0, success: false, error: `HTTP ${res.status}` };
    }

    // Read SSE stream to measure TTFB and total latency
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let firstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstChunk) {
        ttfb = Date.now() - start;
        firstChunk = false;
      }
      // Just consume the stream
      decoder.decode(value, { stream: true });
    }

    return { userId, latencyMs: Date.now() - start, ttfbMs: ttfb, success: true };
  } catch (e) {
    return {
      userId,
      latencyMs: Date.now() - start,
      ttfbMs: ttfb,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Simulate one user sending requests over the duration
// ---------------------------------------------------------------------------

async function simulateUser(userId: string, endTime: number) {
  while (Date.now() < endTime) {
    const result = await simulateRequest(userId);
    results.push(result);
    // Small pause between requests (2-5s random)
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function printReport() {
  const total = results.length;
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);
  const latencies = successes.map((r) => r.latencyMs);
  const ttfbs = successes.map((r) => r.ttfbMs);

  console.log("\n" + "=".repeat(60));
  console.log("LOAD TEST REPORT");
  console.log("=".repeat(60));
  console.log(`Config: ${TEAMS} teams × ${USERS_PER_TEAM} users = ${TEAMS * USERS_PER_TEAM} concurrent users`);
  console.log(`Duration: ${DURATION_SEC}s`);
  console.log(`Total requests: ${total}`);
  console.log(`Successes: ${successes.length} (${((successes.length / total) * 100).toFixed(1)}%)`);
  console.log(`Failures: ${failures.length} (${((failures.length / total) * 100).toFixed(1)}%)`);

  if (latencies.length > 0) {
    console.log("\nLatency (total response):");
    console.log(`  Median (p50): ${percentile(latencies, 50)}ms`);
    console.log(`  p90:          ${percentile(latencies, 90)}ms`);
    console.log(`  p95:          ${percentile(latencies, 95)}ms`);
    console.log(`  p99:          ${percentile(latencies, 99)}ms`);
    console.log(`  Max:          ${Math.max(...latencies)}ms`);

    console.log("\nTime to First Byte (TTFB):");
    console.log(`  Median (p50): ${percentile(ttfbs, 50)}ms`);
    console.log(`  p90:          ${percentile(ttfbs, 90)}ms`);
    console.log(`  p95:          ${percentile(ttfbs, 95)}ms`);
    console.log(`  Max:          ${Math.max(...ttfbs)}ms`);

    const p95Sec = percentile(latencies, 95) / 1000;
    console.log(`\nTarget: p95 latency < 8s → ${p95Sec < 8 ? "PASS" : "FAIL"} (${p95Sec.toFixed(1)}s)`);
  }

  if (failures.length > 0) {
    const errorCounts: Record<string, number> = {};
    for (const f of failures) {
      const key = f.error ?? "unknown";
      errorCounts[key] = (errorCounts[key] ?? 0) + 1;
    }
    console.log("\nError breakdown:");
    for (const [err, count] of Object.entries(errorCounts)) {
      console.log(`  ${err}: ${count}`);
    }
  }

  console.log("=".repeat(60));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Starting load test: ${TEAMS} teams × ${USERS_PER_TEAM} users for ${DURATION_SEC}s`);
  console.log(`Target: ${SUPABASE_URL}/functions/v1/ai-proxy`);

  const endTime = Date.now() + DURATION_SEC * 1000;
  const users: Promise<void>[] = [];

  for (let t = 0; t < TEAMS; t++) {
    for (let u = 0; u < USERS_PER_TEAM; u++) {
      const userId = `team${t + 1}-user${u + 1}`;
      users.push(simulateUser(userId, endTime));
    }
  }

  // Stagger start slightly to avoid thundering herd
  await Promise.all(users);

  printReport();
}

main().catch(console.error);
