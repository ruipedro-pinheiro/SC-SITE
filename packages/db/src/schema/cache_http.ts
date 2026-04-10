import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Tier-2 HTTP cache. Per INGESTION.md §4.2 every external HTTP response is
 * stored here BEFORE the transformer reads it, so a re-run never refetches
 * an unchanged payload. ETag / Last-Modified are persisted so we can issue
 * conditional requests on revalidation.
 *
 * Body lives in `body_text` (TEXT) — Drizzle/bun-sqlite will store JSON
 * payloads as the string they came in as. Binary payloads (rare — only
 * scunpacked tarball blobs in v2) get stored hex-encoded; we'll add a
 * `body_blob BLOB` column then if needed.
 */

export interface CacheHttpHeadersJson {
  [key: string]: string;
}

export const cacheHttp = sqliteTable(
  "cache_http",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Logical source ('uex' | 'wiki' | 'erkul' | 'rsi' | 'cstone' | …). */
    source: text("source").notNull(),
    /** Fully qualified URL (with all query params). */
    url: text("url").notNull(),
    /** HTTP method, defaults to GET. */
    method: text("method").notNull().default("GET"),
    /** Hash of the request body when method != GET; null otherwise. */
    bodyHash: text("body_hash"),
    /** HTTP status code. */
    statusCode: integer("status_code").notNull(),
    /** Compact JSON of relevant response headers. */
    headersJson: text("headers_json", { mode: "json" }).$type<CacheHttpHeadersJson>(),
    /** Raw response body — JSON gets stored verbatim as a string. */
    bodyText: text("body_text"),
    /** ETag captured from response headers (for conditional GETs). */
    etag: text("etag"),
    /** Last-Modified captured from response headers. */
    lastModified: text("last_modified"),
    /** Unix ms when this row was written. */
    fetchedAt: integer("fetched_at").notNull(),
    /** Unix ms when this row should be considered stale. */
    expiresAt: integer("expires_at"),
    /** Body byte size for storage accounting. */
    byteSize: integer("byte_size"),
  },
  (table) => ({
    keyUnique: uniqueIndex("uniq_cache_http_key").on(table.source, table.url, table.bodyHash),
    sourceIdx: index("idx_cache_http_source").on(table.source),
    expiresIdx: index("idx_cache_http_expires").on(table.expiresAt),
  }),
);

export type CacheHttpRow = typeof cacheHttp.$inferSelect;
export type NewCacheHttpRow = typeof cacheHttp.$inferInsert;
