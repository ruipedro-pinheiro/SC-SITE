/**
 * Tiny request logger. Logs `method path status duration requestId` once per
 * response. Uses `console.warn` because Biome forbids plain `console.log` —
 * the noConsole rule allows `warn` and `error`.
 */

import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "../app-variables";
import { makeRequestId } from "../lib/request-id";

export const requestLogger: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const start = performance.now();
  const requestId = makeRequestId(c.req.header("x-request-id"));
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);

  await next();

  const durationMs = Math.round(performance.now() - start);
  const method = c.req.method;
  const path = c.req.path;
  const status = c.res.status;
  console.warn(`[api] ${method} ${path} ${status} ${durationMs}ms req=${requestId}`);
};
