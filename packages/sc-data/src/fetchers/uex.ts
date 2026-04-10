/**
 * UEX API fetchers.
 *
 * This is the ONLY place in the package that calls the HTTP client. Every
 * response is validated through a Zod schema BEFORE returning so downstream
 * layers get fully-typed rows.
 *
 * Layer rules:
 *  - this file may import from `lib/http-client` and `schemas/uex`
 *  - this file MUST NOT import from `@sc-site/db` (that's the loader's job)
 *  - this file MUST NOT import from `transform/*` (that's the orchestrator's
 *    job)
 */

import {
  type HttpClient,
  HttpClientError,
  type HttpResponse,
  createUexHttpClient,
} from "../lib/http-client";
import { logger } from "../lib/logger";
import {
  type UexVehicleRow,
  type UexVehiclesResponse,
  uexVehiclesResponseSchema,
} from "../schemas/uex";

const UEX_BASE_URL = "https://api.uexcorp.space/2.0";

export interface UexFetcherOptions {
  /** Optional pre-built HTTP client (tests, shared limiter). */
  client?: HttpClient;
  /** Override the base URL (tests / mirrors). */
  baseUrl?: string;
}

export class UexFetchError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "UexFetchError";
  }
}

/**
 * Fetch every vehicle UEX knows about. Returns validated rows with
 * snake-case field names preserved.
 *
 * The UEX `/vehicles` endpoint does not require filters — one call yields
 * ~272 rows. Rate limiting and caching are handled by the HTTP client.
 */
export async function fetchAllVehicles(options: UexFetcherOptions = {}): Promise<UexVehicleRow[]> {
  const client = options.client ?? createUexHttpClient();
  const baseUrl = options.baseUrl ?? UEX_BASE_URL;
  const url = `${baseUrl.replace(/\/+$/, "")}/vehicles`;

  logger.info("uex fetchAllVehicles start", { url });

  let httpResponse: HttpResponse;
  try {
    httpResponse = await client.get({ url });
  } catch (err) {
    if (err instanceof HttpClientError) {
      throw new UexFetchError(`failed to GET ${url}: ${err.message}`, "/vehicles", err);
    }
    throw err;
  }

  let json: unknown;
  try {
    json = JSON.parse(httpResponse.bodyText);
  } catch (err) {
    throw new UexFetchError(
      `failed to parse JSON from ${url}: ${(err as Error).message}`,
      "/vehicles",
      err,
    );
  }

  const parsed = uexVehiclesResponseSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new UexFetchError(
      `UEX /vehicles payload failed validation: ${issues}`,
      "/vehicles",
      parsed.error,
    );
  }
  const envelope: UexVehiclesResponse = parsed.data;
  if (envelope.status !== "ok") {
    throw new UexFetchError(`UEX /vehicles returned status="${envelope.status}"`, "/vehicles");
  }

  logger.info("uex fetchAllVehicles done", {
    count: envelope.data.length,
    fromCache: httpResponse.fromCache,
    bytes: httpResponse.byteSize,
  });

  return envelope.data;
}
