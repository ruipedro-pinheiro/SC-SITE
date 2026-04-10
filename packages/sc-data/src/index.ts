/**
 * Public surface of `@sc-site/sc-data`.
 *
 * Wave 1 scope: UEX vehicles ingestion end-to-end. Layers are exposed
 * individually so callers (tests, the ingestion-runner in wave 4, the
 * api-builder in wave 2) can pick the piece they need without pulling the
 * whole pipeline.
 *
 *   - fetchers/* — HTTP layer (rate-limited, cached)
 *   - schemas/*  — Zod shape validation
 *   - transform/* — pure row mapping + generic diff engine
 *   - loaders/*  — DB writers (only place that imports from @sc-site/db
 *                  for writes)
 *   - orchestrator/* — top-level composer + refresh_log bookkeeping
 */

export { HttpClient, HttpClientError, createUexHttpClient } from "./lib/http-client";
export { RateLimiter, createUexRateLimiter } from "./lib/rate-limiter";
export { logger } from "./lib/logger";

export { fetchAllVehicles, UexFetchError } from "./fetchers/uex";

export {
  uexEnvelope,
  uexVehicleSchema,
  uexVehiclesResponseSchema,
  uexVehicleFlagKeys,
} from "./schemas/uex";

export {
  transformUexVehicle,
  inferRoleFromFlags,
  inferSizeFromScu,
  parseContainerSizes,
  parseCrew,
  collectFlags,
} from "./transform/uex-to-vehicle";

export { diffRecord, deepEqual } from "./transform/diff";

export { upsertVehicle, findVehicleById } from "./loaders/upsert-vehicle";

export { runUexVehiclesRefresh } from "./orchestrator/refresh-uex-vehicles";

export type * from "./types";
