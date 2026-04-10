/**
 * Apply pending Drizzle migrations against the SQLite file.
 *
 * Usage:
 *   bun run packages/db/src/migrate.ts
 *   # or, from inside the package:
 *   bun run migrate
 *
 * Idempotent — safe to run repeatedly. Creates the parent `data/` directory
 * if it doesn't exist yet.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db, dbPath } from "./client";

mkdirSync(dirname(dbPath), { recursive: true });

const migrationsFolder = resolve(import.meta.dir, "../migrations");

console.warn(`[db] applying migrations from ${migrationsFolder}`);
console.warn(`[db] target sqlite file: ${dbPath}`);

migrate(db, { migrationsFolder });

console.warn("[db] migrations applied");
