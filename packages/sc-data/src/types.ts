/**
 * Convenience type re-exports. Callers that want the whole ingestion type
 * surface in one import can pull from here.
 */

export type {
  UexVehicleRow,
  UexVehicleFlagKey,
  UexVehiclesResponse,
} from "./schemas/uex";

export type { UexVehicleTransformed } from "./transform/uex-to-vehicle";

export type {
  DiffMeta,
  DiffResult,
} from "./transform/diff";

export type {
  UpsertVehicleInput,
  UpsertVehicleOptions,
  UpsertVehicleOutcome,
  UpsertVehicleResult,
} from "./loaders/upsert-vehicle";

export type {
  RefreshUexVehiclesOptions,
  RefreshUexVehiclesResult,
} from "./orchestrator/refresh-uex-vehicles";

export type {
  HttpClientOptions,
  HttpGetParams,
  HttpResponse,
  HttpSource,
} from "./lib/http-client";

export type { LogEvent, LogLevel, Logger } from "./lib/logger";
