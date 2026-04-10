# @sc-site/sc-data

Data-ingestion package. Pulls from external sources, normalises, writes to
`sc.db`. Layered on purpose:

- `lib/` — rate limiter, HTTP client (rate-limited + cache-first), logger.
- `schemas/` — Zod shape validation per source. No DB / no HTTP.
- `fetchers/` — the only layer that calls `HttpClient`. Returns validated rows.
- `transform/` — PURE functions, no DB, no HTTP. Maps source rows to DB inserts.
  Also home to the generic `diffRecord` change-log engine.
- `loaders/` — the only layer that imports from `@sc-site/db`. Wraps writes
  in a single SQLite transaction. Emits `change_log` rows inline.
- `orchestrator/` — top-level composer. Owns the `refresh_log` row.

Wave 1 ships the UEX vehicles pipeline end-to-end. Hardpoints and damage
resistance are intentionally left empty — UEX doesn't expose them. Future
waves will enrich from erkul / scunpacked / wiki.

**Zero hardcoded ship data anywhere**: search the source tree for "Carrack"
or "Corsair" and you will find nothing.
