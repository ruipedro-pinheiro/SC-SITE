#!/usr/bin/env bun
/**
 * Manual kick of the UEX vehicles refresh.
 *
 * Usage:
 *   bun run packages/sc-data/scripts/refresh-uex-vehicles.ts            # real run
 *   bun run packages/sc-data/scripts/refresh-uex-vehicles.ts --dry-run  # builds + logs,
 *                                                                      # does not fetch
 *
 * The dry-run flag is the compile smoke-test the brief asks for. It opens
 * a refresh_log row, closes it immediately with status="ok" and
 * rowCount=0, and exits. Use it to verify the pipeline wiring without
 * hitting UEX or mutating any vehicle rows.
 */

import { runUexVehiclesRefresh } from "../src/orchestrator/refresh-uex-vehicles";

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

async function main(): Promise<number> {
  const dryRun = hasFlag("--dry-run");
  const result = await runUexVehiclesRefresh({ dryRun });

  // This script is the one place we genuinely want stdout output so the
  // shell operator sees the summary. Biome allows `console.error`, and
  // stderr is appropriate for tool output when the primary purpose is
  // human readability (as with `time` / `curl -v` / …).
  console.error(
    JSON.stringify(
      {
        refreshLogId: result.refreshLogId,
        inserted: result.inserted,
        updated: result.updated,
        unchanged: result.unchanged,
        errors: result.errors,
        totalChanges: result.totalChanges,
        durationMs: result.durationMs,
        status: result.status,
        dryRun: result.dryRun,
      },
      null,
      2,
    ),
  );

  return result.status === "error" ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error("refresh-uex-vehicles crashed:", (err as Error).message);
    process.exit(2);
  });
