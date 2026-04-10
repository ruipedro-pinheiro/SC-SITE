/**
 * Public type surface of `@sc-site/api`.
 *
 * Consumers (apps/web, tests) should import from here rather than reaching
 * into `./app` directly, to keep the import path stable if we later split
 * the app instance into multiple files.
 */

export type { AppType } from "./app";
export type { AppVariables } from "./app-variables";
export type {
  ShipDto,
  HardpointDto,
  DamageResistanceDto,
  DamageResistanceRowDto,
} from "./lib/ship-mapper";
export type { SuccessEnvelope, ErrorEnvelope, ResponseMeta } from "./lib/envelope";
export type { ApiErrorCode } from "./lib/errors";
