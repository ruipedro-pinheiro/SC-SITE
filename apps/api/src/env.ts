/**
 * Environment variable parsing and validation.
 *
 * All env vars flow through Zod so the rest of the codebase can trust the
 * shape. Missing optional vars collapse to `undefined`; missing required vars
 * throw at boot (fail fast).
 */

import { z } from "zod";

const EnvSchema = z.object({
  /** HTTP port the Bun server listens on. Defaults to 3001 so it doesn't collide with Next dev on 3000. */
  PORT: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : 3001))
    .pipe(z.number().int().positive()),

  /**
   * Override for the SQLite path. When unset, @sc-site/db's client resolves
   * to `<repo>/data/sc.db` automatically. We only re-export the value here
   * so callers can log which DB is being read without re-deriving the path.
   */
  SC_SITE_DB_PATH: z.string().optional(),

  /**
   * UEX API bearer token. Not used by the HTTP layer directly — forwarded
   * to the ingestion orchestrator once wave 2 lands.
   */
  UEX_API_TOKEN: z.string().optional(),

  /**
   * Admin bearer token gating `/admin/*` routes. If unset, the middleware
   * logs a dev-mode warning and still accepts any bearer so local dev
   * doesn't require setting a secret.
   */
  ADMIN_SECRET: z.string().optional(),

  /** Node-style env indicator; we use it to decide whether to log stack traces. */
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Biome's noConsole allows warn/error — boot failure is an error.
    console.error("[env] failed to parse environment:", parsed.error.format());
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();
