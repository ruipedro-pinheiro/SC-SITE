/**
 * Admin routes — currently just the UEX vehicles refresh trigger.
 *
 * Auth model: bearer token in `Authorization: Bearer <ADMIN_SECRET>`.
 * If `ADMIN_SECRET` is not set in env, the middleware accepts ANY bearer
 * (including an empty one) and logs a loud warning, so local dev isn't
 * blocked on setting a secret. Production MUST set ADMIN_SECRET.
 */

import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { env } from "../env";
import { wrap } from "../lib/envelope";
import { UnauthorizedError } from "../lib/errors";
import { runUexVehiclesRefresh } from "../services/refresh-service";

const requireBearer: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("authorization") ?? c.req.header("Authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;

  if (!env.ADMIN_SECRET) {
    console.warn(
      "[admin] ADMIN_SECRET not set — accepting any bearer (DEV MODE). Set ADMIN_SECRET in production.",
    );
    await next();
    return;
  }

  if (!bearer || bearer !== env.ADMIN_SECRET) {
    throw new UnauthorizedError("Invalid or missing admin bearer token");
  }
  await next();
};

export const adminRoute = new Hono().post("/admin/refresh/vehicles", requireBearer, async (c) => {
  const stats = await runUexVehiclesRefresh();
  return c.json(
    wrap(stats, {
      source: "sc-data:uex-vehicles",
    }),
  );
});
