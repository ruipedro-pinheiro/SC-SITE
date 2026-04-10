import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit config — generates SQL migrations and applies them against the
 * canonical SQLite file at `data/sc.db` (relative to the monorepo root).
 *
 * The schema barrel re-exports every table file so a single `bun drizzle-kit
 * generate` picks up additions automatically.
 */
export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "../../data/sc.db",
  },
  strict: true,
  verbose: true,
} satisfies Config;
