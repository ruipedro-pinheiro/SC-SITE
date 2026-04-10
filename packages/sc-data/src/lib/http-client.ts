/**
 * Central HTTP client for the sc-data package.
 *
 * Everything flows through here so that three invariants hold automatically:
 *
 *  1. **Rate limit**: every request awaits a `RateLimiter.take()` before
 *     actually hitting the network.
 *  2. **Cache-first**: we look the request up in `cache_http` first. If a
 *     fresh (`expires_at > now`) row exists we return it without touching
 *     the network.
 *  3. **Write-before-parse**: on a fresh fetch we persist the raw response
 *     body to `cache_http` BEFORE returning it to callers. The parser sits
 *     above us, so a Zod failure never loses the bytes — you can re-run the
 *     transform pipeline off the cached row.
 *
 * Callers never see `Response` objects; they only see decoded text bodies
 * and metadata. The JSON decoding is their job, because the transform layer
 * also needs access to the raw string to compute `byte_size` and to hand
 * the body to Zod.
 *
 * NO HARDCODE: this module knows nothing about UEX fields, vehicle shape,
 * or any specific endpoint. It is a plain fetch wrapper.
 */

import { createHash } from "node:crypto";
import { cacheHttp, db as defaultDb } from "@sc-site/db";
import type { DB } from "@sc-site/db";
import { and, eq, isNull } from "drizzle-orm";
import { logger } from "./logger";
import { type RateLimiter, createUexRateLimiter } from "./rate-limiter";

/**
 * NOTE on `UEX_API_TOKEN`: production reads from the monorepo root `.env`
 * via a `bun --env-file=.env run …` invocation. For dev on the Pi, the
 * previous session stored a token at
 * `/home/pedro/sc-site-eb3fe870-ghost/.env`. We intentionally do NOT read
 * that file here — callers should set `UEX_API_TOKEN` in the shell
 * environment. The fallback comment is preserved so future agents know
 * where the legacy token lives.
 */

export type HttpSource = "uex" | "wiki" | "erkul" | "rsi" | "cstone" | "scunpacked";

export interface HttpClientOptions {
  /** Logical source name — used as a component of the cache key + log label. */
  source: HttpSource;
  /** Optional override: default is a fresh UEX rate limiter. */
  limiter?: RateLimiter;
  /** Cache TTL in milliseconds. Default 24h. */
  cacheTtlMs?: number;
  /** Per-request fetch timeout in milliseconds. Default 30s. */
  timeoutMs?: number;
  /** Max retries on HTTP 429 / transient 5xx. Default 3. */
  maxRetries?: number;
  /** Optional auth secret key (UEX `secret_key` header). */
  secretKey?: string;
  /** Drizzle handle. Defaults to the `@sc-site/db` singleton. */
  db?: DB;
  /** Injected fetch, mainly for tests. */
  fetchImpl?: typeof fetch;
  /** Clock for cache expiry. */
  now?: () => number;
  /** Bypass the cache (force a network hit). */
  bypassCache?: boolean;
}

export interface HttpGetParams {
  /** Fully qualified URL. Query string should already be baked in. */
  url: string;
  /** Extra request headers (merged with defaults). */
  headers?: Record<string, string>;
  /** Per-call TTL override. */
  cacheTtlMs?: number;
}

export interface HttpResponse {
  /** HTTP status code from the origin (cached or fresh). */
  status: number;
  /** Response body as a UTF-8 string. Callers parse JSON themselves. */
  bodyText: string;
  /** Was this response served from the disk cache (true) or the network (false)? */
  fromCache: boolean;
  /** Unix ms when the row was fetched from the origin. */
  fetchedAt: number;
  /** Unix ms when the row becomes stale. */
  expiresAt: number;
  /** Byte size of the body. */
  byteSize: number;
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * Cache key: SHA-256 of `<source>\n<method>\n<url>\n<bodyHash>`.
 * We only use GET today; body hash is reserved for future POSTs and is
 * always null for reads.
 */
function computeCacheKey(source: HttpSource, method: string, url: string): string {
  return createHash("sha256").update(`${source}\n${method}\n${url}\n`).digest("hex");
}

function headersToJson(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  // Only keep headers that are useful for conditional requests and debugging.
  const keep = [
    "content-type",
    "content-length",
    "etag",
    "last-modified",
    "date",
    "x-ratelimit-remaining",
    "x-ratelimit-limit",
    "x-ratelimit-reset",
  ];
  for (const name of keep) {
    const v = res.headers.get(name);
    if (v !== null) out[name] = v;
  }
  return out;
}

function backoffDelayMs(attempt: number): number {
  // 500ms, 1s, 2s, 4s…
  return 500 * 2 ** attempt;
}

/**
 * A small wrapper around `fetch` that enforces rate limiting, cache-first
 * semantics, and write-before-parse.
 */
export class HttpClient {
  private readonly source: HttpSource;
  private readonly limiter: RateLimiter;
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly secretKey: string | undefined;
  private readonly db: DB;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly bypassCache: boolean;

  constructor(opts: HttpClientOptions) {
    this.source = opts.source;
    this.limiter = opts.limiter ?? createUexRateLimiter();
    this.cacheTtlMs = opts.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.secretKey = opts.secretKey ?? process.env.UEX_API_TOKEN ?? undefined;
    this.db = opts.db ?? defaultDb;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? (() => Date.now());
    this.bypassCache = opts.bypassCache ?? false;
  }

  async get(params: HttpGetParams): Promise<HttpResponse> {
    const { url } = params;
    const method = "GET";
    const now = this.now();
    const ttl = params.cacheTtlMs ?? this.cacheTtlMs;

    // 1. Cache lookup (skipped if bypassCache is set).
    if (!this.bypassCache) {
      const hit = this.lookupCache(url);
      if (hit !== null && (hit.expiresAt ?? 0) > now) {
        logger.debug("http cache hit", { source: this.source, url });
        return {
          status: hit.statusCode,
          bodyText: hit.bodyText ?? "",
          fromCache: true,
          fetchedAt: hit.fetchedAt,
          expiresAt: hit.expiresAt ?? now + ttl,
          byteSize: hit.byteSize ?? hit.bodyText?.length ?? 0,
        };
      }
    }

    // 2. Rate-limited network fetch with retry/backoff.
    const { status, bodyText, headers } = await this.fetchWithRetry(url, params.headers);

    // 3. Write-before-parse — persist raw bytes BEFORE the transform layer
    // reads them, so a validation crash never loses the upstream payload.
    const fetchedAt = this.now();
    const expiresAt = fetchedAt + ttl;
    const byteSize = new TextEncoder().encode(bodyText).byteLength;
    this.writeCache({
      url,
      method,
      status,
      headers,
      bodyText,
      fetchedAt,
      expiresAt,
      byteSize,
    });

    return {
      status,
      bodyText,
      fromCache: false,
      fetchedAt,
      expiresAt,
      byteSize,
    };
  }

  private lookupCache(url: string): {
    statusCode: number;
    bodyText: string | null;
    fetchedAt: number;
    expiresAt: number | null;
    byteSize: number | null;
  } | null {
    // `body_hash` is always null for GETs. `and(eq(...), isNull(body_hash))`
    // matches exactly the row we wrote.
    const row = this.db
      .select({
        statusCode: cacheHttp.statusCode,
        bodyText: cacheHttp.bodyText,
        fetchedAt: cacheHttp.fetchedAt,
        expiresAt: cacheHttp.expiresAt,
        byteSize: cacheHttp.byteSize,
      })
      .from(cacheHttp)
      .where(
        and(eq(cacheHttp.source, this.source), eq(cacheHttp.url, url), isNull(cacheHttp.bodyHash)),
      )
      .get();
    return row ?? null;
  }

  private writeCache(args: {
    url: string;
    method: string;
    status: number;
    headers: Record<string, string>;
    bodyText: string;
    fetchedAt: number;
    expiresAt: number;
    byteSize: number;
  }): void {
    // Upsert on the unique (source, url, body_hash) index. Drizzle
    // `onConflictDoUpdate` maps to SQLite `ON CONFLICT … DO UPDATE`.
    // Note the key is deterministic for GETs (body_hash=null).
    const key = computeCacheKey(this.source, args.method, args.url);
    logger.debug("http cache write", {
      source: this.source,
      url: args.url,
      status: args.status,
      bytes: args.byteSize,
      key,
    });
    this.db
      .insert(cacheHttp)
      .values({
        source: this.source,
        url: args.url,
        method: args.method,
        bodyHash: null,
        statusCode: args.status,
        headersJson: args.headers,
        bodyText: args.bodyText,
        etag: args.headers.etag ?? null,
        lastModified: args.headers["last-modified"] ?? null,
        fetchedAt: args.fetchedAt,
        expiresAt: args.expiresAt,
        byteSize: args.byteSize,
      })
      .onConflictDoUpdate({
        target: [cacheHttp.source, cacheHttp.url, cacheHttp.bodyHash],
        set: {
          statusCode: args.status,
          headersJson: args.headers,
          bodyText: args.bodyText,
          etag: args.headers.etag ?? null,
          lastModified: args.headers["last-modified"] ?? null,
          fetchedAt: args.fetchedAt,
          expiresAt: args.expiresAt,
          byteSize: args.byteSize,
        },
      })
      .run();
  }

  private async fetchWithRetry(
    url: string,
    extraHeaders: Record<string, string> | undefined,
  ): Promise<{ status: number; bodyText: string; headers: Record<string, string> }> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.limiter.take();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "sc-site/0.1 (+https://github.com/tugakit/sc-site)",
        ...(extraHeaders ?? {}),
      };
      // UEX's public read endpoints work without auth but the legacy
      // `secret_key` header is still honoured and is required for write
      // operations. See SOURCES.md §1.
      if (this.source === "uex" && this.secretKey) {
        headers.secret_key = this.secretKey;
      }

      let res: Response;
      try {
        res = await this.fetchImpl(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        logger.warn("http network error", {
          source: this.source,
          url,
          attempt,
          message: (err as Error).message,
        });
        if (attempt < this.maxRetries) {
          await Bun.sleep(backoffDelayMs(attempt));
          continue;
        }
        throw new HttpClientError(
          `network error fetching ${url}: ${(err as Error).message}`,
          undefined,
          url,
          err,
        );
      }
      clearTimeout(timer);

      // Retry on 429 (rate-limited) and 5xx transient failures.
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "0");
        const wait = retryAfter > 0 ? retryAfter * 1000 : backoffDelayMs(attempt);
        logger.warn("http transient failure", {
          source: this.source,
          url,
          status: res.status,
          attempt,
          waitMs: wait,
        });
        if (attempt < this.maxRetries) {
          await Bun.sleep(wait);
          continue;
        }
        // Fall through to the `!res.ok` handling below if out of retries.
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpClientError(
          `HTTP ${res.status} from ${url}: ${body.slice(0, 200)}`,
          res.status,
          url,
        );
      }

      const bodyText = await res.text();
      return {
        status: res.status,
        bodyText,
        headers: headersToJson(res),
      };
    }
    throw new HttpClientError(`exhausted retries fetching ${url}`, undefined, url, lastError);
  }
}

/**
 * Convenience factory — callers that just need "a UEX client with defaults"
 * call this instead of passing `{ source: "uex" }` everywhere.
 */
export function createUexHttpClient(options: Partial<HttpClientOptions> = {}): HttpClient {
  return new HttpClient({ source: "uex", ...options });
}
