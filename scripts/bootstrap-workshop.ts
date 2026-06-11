/**
 * Bootstrap Workshop: generates 10 team codes and inserts them into Supabase.
 *
 * Usage:
 *   pnpm tsx scripts/bootstrap-workshop.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TEAM_COUNT = 10;
const ANIMATORS = ["mehdi", "mehdi", "mehdi", "mehdi", "mehdi", "rejane", "rejane", "rejane", "rejane", "rejane"];

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function main() {
  // Check for existing teams
  const { data: existing } = await supabase.from("teams").select("id");
  if (existing && existing.length > 0) {
    console.error(`${existing.length} teams already exist. Delete them first or skip bootstrap.`);
    process.exit(1);
  }

  const codes = new Set<string>();
  while (codes.size < TEAM_COUNT) {
    codes.add(generateCode());
  }

  const teams = Array.from(codes).map((code, i) => ({
    code,
    animator: ANIMATORS[i],
  }));

  const { data, error } = await supabase.from("teams").insert(teams).select("id, code, animator");

  if (error) {
    console.error("Failed to insert teams:", error.message);
    process.exit(1);
  }

  console.log("Workshop bootstrapped! Teams:");
  console.log("=".repeat(40));
  for (const team of data) {
    console.log(`  Code: ${team.code}  |  Animateur: ${team.animator}  |  ID: ${team.id}`);
  }
  console.log("=".repeat(40));
  console.log(`\n${data.length} teams created. Print these codes on cards for day J.`);

  // Reset workshop_state
  const { error: stateError } = await supabase
    .from("workshop_state")
    .upsert({ id: 1, is_paused: false, active_challenge_id: null, active_challenge_ids: [] });

  if (stateError) {
    console.warn("Warning: could not reset workshop_state:", stateError.message);
  } else {
    console.log("Workshop state reset to default.");
  }
}

main().catch(console.error);
