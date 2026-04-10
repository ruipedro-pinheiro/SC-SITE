/**
 * Uncaught-error → envelope translator.
 *
 * Installed via `app.onError()` rather than as a standard middleware so it
 * can intercept thrown exceptions from any handler or downstream middleware.
 * Known ApiError subclasses → their declared status + code. Everything else
 * → 500 with a generic message (stack is logged server-side but never
 * returned to the client).
 */

import type { ErrorHandler } from "hono";
import type { AppVariables } from "../app-variables";
import { env } from "../env";
import { errorEnvelope } from "../lib/envelope";
import { ApiError } from "../lib/errors";
import { makeRequestId } from "../lib/request-id";

export const errorHandler: ErrorHandler<{ Variables: AppVariables }> = (err, c) => {
  const requestId = c.get("requestId") ?? makeRequestId(c.req.header("x-request-id"));

  if (err instanceof ApiError) {
    const body = errorEnvelope(err.code, err.message, requestId, err.details);
    return c.json(body, err.status as 400 | 401 | 403 | 404 | 409 | 500);
  }

  // Unknown error — log full detail, return a redacted envelope.
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    `[api] unhandled error req=${requestId} msg=${message}${
      env.NODE_ENV === "development" && stack ? `\n${stack}` : ""
    }`,
  );

  const body = errorEnvelope("INTERNAL", "Internal server error", requestId);
  return c.json(body, 500);
};
