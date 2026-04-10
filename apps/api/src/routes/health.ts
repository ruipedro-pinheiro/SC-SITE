/**
 * GET /health — liveness + DB row counts.
 *
 * Returns 200 when the DB is reachable (even if empty), 503 when the DB
 * layer threw. Uptime is process-relative in milliseconds so graphs can
 * detect restarts.
 */

import { Hono } from "hono";
import type { AppVariables } from "../app-variables";
import { wrap } from "../lib/envelope";
import { getDbHealth } from "../services/health-service";

const BOOT_AT_MS = Date.now();

const VERSION = "0.0.1";

export const healthRoute = new Hono<{ Variables: AppVariables }>().get("/health", async (c) => {
  const db = await getDbHealth();
  const data = {
    ok: db.status === "ok",
    uptime: Date.now() - BOOT_AT_MS,
    version: VERSION,
    db,
  };
  const requestId = c.get("requestId");
  const body = wrap(data, { source: "sc.db", ...(requestId ? { requestId } : {}) });
  if (db.status !== "ok") {
    return c.json(body, 503);
  }
  return c.json(body, 200);
});
