import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

/**
 * Resolve the canonical SQLite file path.
 *
 * Default: `<monorepo-root>/data/sc.db` (i.e. `packages/db/src/../../../data/sc.db`).
 * Override with `SC_SITE_DB_PATH` for tests, scratch databases, or local
 * mirrors. The directory is NOT auto-created here — `migrate.ts` does that
 * before the migrator runs.
 */
function resolveDbPath(): string {
  const fromEnv = process.env.SC_SITE_DB_PATH;
  if (fromEnv && fromEnv.length > 0) {
    return resolve(fromEnv);
  }
  // packages/db/src → ../../../data/sc.db
  return resolve(import.meta.dir, "../../../data/sc.db");
}

export const dbPath = resolveDbPath();

/**
 * Raw bun:sqlite handle. Exported for callers that need to run pragmas, run
 * raw SQL, or attach databases (e.g. the migrate script). Pragmas applied
 * here are inherited by the Drizzle wrapper.
 */
export const sqlite = new Database(dbPath, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");
sqlite.exec("PRAGMA synchronous = NORMAL;");

/**
 * Drizzle client. Use `db.select().from(schema.vehicles)…` etc. The schema is
 * passed in so the relational query API works (`db.query.vehicles…`).
 */
export const db = drizzle(sqlite, { schema });

export type DB = typeof db;
