import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Run-level refresh audit. ONE row per ingestion job run (not per row
 * touched). Pair with `change_log` (field-level) to answer "what changed in
 * the refresh-erkul run last Sunday at 03:30?".
 *
 * Read by the API health endpoint and the admin debug page so a stalled
 * cron is visible in 1 SQL query (`order by started_at desc limit 20`).
 */

export type RefreshStatus = "ok" | "error" | "partial" | "running";

export const refreshLog = sqliteTable(
  "refresh_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Source identifier (e.g. 'uex.vehicles', 'wiki.ships', 'erkul.loadouts'). */
    source: text("source").notNull(),
    /** Unix ms when the job started. */
    startedAt: integer("started_at").notNull(),
    /** Unix ms when the job finished (NULL while still running). */
    endedAt: integer("ended_at"),
    /** Final status. 'running' is allowed mid-run. */
    status: text("status").$type<RefreshStatus>().notNull(),
    /** How many rows were upserted in this run. */
    rowCount: integer("row_count").notNull().default(0),
    /** Wall time in milliseconds (computed at finish). */
    durationMs: integer("duration_ms"),
    /** Error message captured if status='error' or 'partial'. */
    errorMsg: text("error_msg"),
  },
  (table) => ({
    sourceIdx: index("idx_refresh_log_source").on(table.source),
    startedIdx: index("idx_refresh_log_started").on(table.startedAt),
    sourceStartedIdx: index("idx_refresh_log_source_started").on(table.source, table.startedAt),
  }),
);

export type RefreshLogRow = typeof refreshLog.$inferSelect;
export type NewRefreshLogRow = typeof refreshLog.$inferInsert;
