/**
 * Top-level composer for the UEX vehicles refresh.
 *
 * Flow:
 *   1. Open a `refresh_log` row (`status="running"`, `started_at=now`).
 *   2. Call `fetchAllVehicles()` — hits the HTTP layer, rate-limited and
 *      cached.
 *   3. Walk every row: transform → upsert. Per-row exceptions are caught
 *      and recorded in the error tally; one bad row does NOT abort the
 *      job.
 *   4. Close the refresh_log row with the final status, row_count,
 *      duration.
 *
 * Returned stats allow the caller / ingestion-runner to decide if the run
 * should be considered healthy (status=ok) or degraded (status=partial /
 * status=error).
 */

import { type DB, type NewRefreshLogRow, db as defaultDb, refreshLog } from "@sc-site/db";
import { eq } from "drizzle-orm";
import { fetchAllVehicles } from "../fetchers/uex";
import type { HttpClient } from "../lib/http-client";
import { logger } from "../lib/logger";
import { upsertVehicle } from "../loaders/upsert-vehicle";
import type { UexVehicleRow } from "../schemas/uex";
import { transformUexVehicle } from "../transform/uex-to-vehicle";

export interface RefreshUexVehiclesOptions {
  /** Override the HTTP client (tests). */
  httpClient?: HttpClient;
  /** Inject a pre-fetched row set, skipping the HTTP layer entirely. */
  rows?: UexVehicleRow[];
  /** Drizzle handle (tests). */
  db?: DB;
  /** Clock override (tests). */
  now?: () => number;
  /**
   * When true the orchestrator builds the pipeline, writes the
   * `refresh_log` row, then returns immediately WITHOUT fetching or
   * upserting. Used by the smoke-test script to verify compilation.
   */
  dryRun?: boolean;
}

export interface RefreshUexVehiclesResult {
  refreshLogId: number;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: number;
  totalChanges: number;
  durationMs: number;
  status: "ok" | "partial" | "error";
  dryRun: boolean;
}

const SOURCE = "uex.vehicles";

export async function runUexVehiclesRefresh(
  options: RefreshUexVehiclesOptions = {},
): Promise<RefreshUexVehiclesResult> {
  const database = options.db ?? defaultDb;
  const nowFn = options.now ?? (() => Date.now());
  const dryRun = options.dryRun ?? false;

  const startedAt = nowFn();
  logger.info("refreshUexVehicles start", { source: SOURCE, startedAt, dryRun });

  // 1. Open the refresh_log row.
  const initial: NewRefreshLogRow = {
    source: SOURCE,
    startedAt,
    endedAt: null,
    status: "running",
    rowCount: 0,
    durationMs: null,
    errorMsg: null,
  };
  const inserted = database
    .insert(refreshLog)
    .values(initial)
    .returning({ id: refreshLog.id })
    .all();
  const refreshLogId = inserted[0]?.id;
  if (refreshLogId === undefined) {
    throw new Error("failed to open refresh_log row — no id returned");
  }

  if (dryRun) {
    const endedAt = nowFn();
    database
      .update(refreshLog)
      .set({
        endedAt,
        status: "ok",
        rowCount: 0,
        durationMs: endedAt - startedAt,
      })
      .where(eq(refreshLog.id, refreshLogId))
      .run();
    logger.info("refreshUexVehicles dry-run complete", { refreshLogId });
    return {
      refreshLogId,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      totalChanges: 0,
      durationMs: endedAt - startedAt,
      status: "ok",
      dryRun: true,
    };
  }

  let rows: UexVehicleRow[];
  try {
    rows =
      options.rows ??
      (await fetchAllVehicles(
        options.httpClient !== undefined ? { client: options.httpClient } : {},
      ));
  } catch (err) {
    const endedAt = nowFn();
    const message = (err as Error).message;
    database
      .update(refreshLog)
      .set({
        endedAt,
        status: "error",
        rowCount: 0,
        durationMs: endedAt - startedAt,
        errorMsg: message.slice(0, 500),
      })
      .where(eq(refreshLog.id, refreshLogId))
      .run();
    logger.error("refreshUexVehicles fetch failed", { refreshLogId, message });
    return {
      refreshLogId,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: 1,
      totalChanges: 0,
      durationMs: endedAt - startedAt,
      status: "error",
      dryRun: false,
    };
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let errorCount = 0;
  let totalChanges = 0;
  const errorSamples: string[] = [];

  for (const row of rows) {
    try {
      const transformed = transformUexVehicle(row);
      const result = upsertVehicle(transformed, {
        source: "uex",
        db: database,
        now: nowFn,
      });
      totalChanges += result.changesEmitted;
      if (result.outcome === "inserted") insertedCount++;
      else if (result.outcome === "updated") updatedCount++;
      else unchangedCount++;
    } catch (err) {
      errorCount++;
      const message = (err as Error).message;
      if (errorSamples.length < 5) errorSamples.push(message);
      logger.warn("refreshUexVehicles row failed", {
        id: row.id,
        slug: row.slug,
        message,
      });
    }
  }

  const endedAt = nowFn();
  const status: "ok" | "partial" | "error" =
    errorCount === 0 ? "ok" : errorCount === rows.length ? "error" : "partial";
  const errorMsg = errorSamples.length > 0 ? errorSamples.join(" | ").slice(0, 500) : null;

  database
    .update(refreshLog)
    .set({
      endedAt,
      status,
      rowCount: insertedCount + updatedCount + unchangedCount,
      durationMs: endedAt - startedAt,
      errorMsg,
    })
    .where(eq(refreshLog.id, refreshLogId))
    .run();

  logger.info("refreshUexVehicles done", {
    refreshLogId,
    inserted: insertedCount,
    updated: updatedCount,
    unchanged: unchangedCount,
    errors: errorCount,
    totalChanges,
    durationMs: endedAt - startedAt,
    status,
  });

  return {
    refreshLogId,
    inserted: insertedCount,
    updated: updatedCount,
    unchanged: unchangedCount,
    errors: errorCount,
    totalChanges,
    durationMs: endedAt - startedAt,
    status,
    dryRun: false,
  };
}
