/**
 * Hono app factory. Returns a fully-wired, type-chained instance whose
 * `typeof app` is exported as `AppType` — the RPC client in apps/web
 * imports this type to get auto-completion and response-type inference
 * across the wire.
 *
 * Why the chain matters: Hono's RPC client walks the chain to discover
 * every registered route and its input/output schemas. We MUST compose
 * with `.route()` and keep the `.route().route()...` chain typed end to
 * end. Breaking the chain into a `const x = new Hono(); x.route(...)`
 * sequence erases the types. Hence the single expression below.
 */

import { Hono } from "hono";
import type { AppVariables } from "./app-variables";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import {
  adminRoute,
  commoditiesRoute,
  healthRoute,
  itemsRoute,
  locationsRoute,
  searchRoute,
  shopsRoute,
  vehiclesRoute,
} from "./routes";

export type { AppVariables };

export const app = new Hono<{ Variables: AppVariables }>()
  .use("*", requestLogger)
  .use("*", corsMiddleware)
  .route("/", healthRoute)
  .route("/", vehiclesRoute)
  .route("/", itemsRoute)
  .route("/", shopsRoute)
  .route("/", commoditiesRoute)
  .route("/", locationsRoute)
  .route("/", searchRoute)
  .route("/", adminRoute)
  .onError(errorHandler);

/**
 * The Hono RPC client type. Import from apps/web as:
 *
 *   import { hc } from "hono/client";
 *   import type { AppType } from "@sc-site/api";
 *   const client = hc<AppType>("http://localhost:3001");
 *
 * Response bodies are fully typed based on the `c.json(...)` calls in each
 * route handler.
 */
export type AppType = typeof app;
