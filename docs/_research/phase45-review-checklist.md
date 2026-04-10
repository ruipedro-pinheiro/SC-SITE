# Phase 4 + Phase 5 — Architecture Review Checklist

> Compiled by `architecture-reviewer` from `docs/MOCKUP.md`,
> `docs/INGESTION.md`, `docs/SOURCES.md`,
> `docs/_research/carrack-canonical-specs.md`, the previous
> `docs/_research/scaffold-review-checklist.md`, `CLAUDE.md`, and the
> ghost reference at `~/sc-site-eb3fe870-ghost/packages/db/src/schema/`.
>
> This is the binary grading rubric the reviewer will run when the
> 5-agent team announces "START FINAL REVIEW". Every box is pass/fail.
> Pedro's directive today: **"faut arrêter avec le hardcode ! faut
> penser à la scalabilité de tout ce qu'on fait"**. The bar is "no
> hardcode, no shortcut, no non-scalable pattern".

---

## 0. Hardcode hunt — global pre-flight (the directive)

These checks run across the **entire monorepo** before the per-section
walks. A single hit is an automatic ITERATE.

- [ ] Zero `const CARRACK = ...` / `const CORSAIR = ...` / inline ship
      literals anywhere outside `apps/web/lib/mock-data.ts` (which is
      itself slated for deletion in §D).
- [ ] Zero hardcoded `slug` lists (`['carrack', 'corsair', ...]`)
      anywhere — neither as a "curated subset" filter nor as a
      hangar whitelist.
- [ ] Zero hardcoded manufacturer arrays. Manufacturers come from the
      DB join, not from a TS const.
- [ ] No `seed.ts`, no `fixtures/`, no `*.fixture.ts`, no
      `__seed__/` folder shipping ship/item rows.
- [ ] No JSON file imported at compile time that contains
      ship/item/commodity rows. The only allowed compile-time JSON is
      schema configuration (e.g. `tsconfig.json`, `biome.json`,
      `package.json`).
- [ ] No hardcoded API base URL. Every fetch URL is composed from an
      env var (`UEX_API_BASE`, `WIKI_API_BASE`, …) with a default in
      one central config module — never inline.
- [ ] No hardcoded HTTP token. UEX `secret_key` header read from
      `process.env.UEX_API_TOKEN`, no fallback string.
- [ ] No hardcoded rate-limit numbers scattered. The `120 req/min`
      UEX limit lives in **one** place (the rate-limited http
      client), keyed by source.
- [ ] No hardcoded TTLs scattered. Per-source TTLs from
      `INGESTION.md §4` live in one config map, not inline magic.
- [ ] No hardcoded ship dimensions / mass / shield HP / weapon
      counts in the UI components — they read from the
      `Ship`/`Vehicle` props.
- [ ] `grep -r 'Carrack\|Corsair\|MSR\|Aurora MR' apps/ packages/`
      returns ZERO hits outside `mock-data.ts` and tests.
- [ ] `grep -rn '180000\|70000\|3275858\|f6d606c9' apps/ packages/`
      (Carrack canonical numbers) returns ZERO hits — no number from
      the carrack-canonical-specs research has been baked into code.

---

## A. `packages/db` — Drizzle schemas + client

### A.1 Purity (no data, only shape)
- [ ] No `seed.ts`, no inline arrays of ships, no static JSON
      fixtures imported in any `src/schema/*.ts` file.
- [ ] Pure shape definitions only. The package exports tables and
      types — never values.
- [ ] No hardcoded SQL strings outside drizzle-kit migration files.

### A.2 Column typing
- [ ] Every text column uses `text({...}).notNull()` or is
      intentionally nullable. No accidental nullable.
- [ ] No `any` anywhere.
- [ ] JSON columns use `text({ mode: 'json' }).$type<Block>()` per
      `INGESTION.md §7`.
- [ ] Numeric columns: `integer` for ints, `real` for floats. No
      stringified numbers stored as text "for convenience".
- [ ] `vehicles` JSON blocks present per §1 / §6:
      `dimensions`, `mass`, `cargo`, `crew`, `fuel`, `combat`,
      `mobility`, `weapon_snapshot`, `loadout`, `emission`,
      `image_set`, `loaners`, `data_sources`.
- [ ] `vehicles` hoisted IFCS columns present per §4.5.1:
      `mass_empty_kg`, `mass_loadout_kg`, `thrust_main_n`,
      `thrust_retro_n`, `thrust_lateral_n`, `thrust_vertical_n`,
      `torque_x_nm`, `torque_y_nm`, `torque_z_nm`, `cargo_max_scu`.
- [ ] `vehicles.flags` packed bitfield int present, with named flag
      enum in `vehicle-flags.ts`.
- [ ] Generated stored column `is_spaceship` indexed.

### A.3 Foreign keys + cascades
- [ ] `terminals.location_id` → `locations.id`.
- [ ] `locations.parent_id` → `locations.id` (self-FK).
- [ ] `shops.terminal_id` → `terminals.id`.
- [ ] `price_snapshot` polymorphic `subject_kind` + `subject_id`
      with at minimum a non-FK index.
- [ ] `change_log.entity_uuid` indexed (composite with
      `entity_type`).
- [ ] `loot_table_entry` → `loot_table` ON DELETE CASCADE.
- [ ] `component_damage_map.component_uuid` → `items.uuid`.
- [ ] `item_signature_coefficients.item_uuid` → `items.uuid`.

### A.4 Indexes for API query patterns
- [ ] `vehicles.slug` UNIQUE index.
- [ ] `vehicles.manufacturer` index (catalog filter).
- [ ] `change_log` (`entity_type`, `entity_uuid`) + (`ts DESC`).
- [ ] `refresh_log` (`job`, `started_at DESC`).
- [ ] `cache_http` UNIQUE (`source`, `url`, `body_hash`).
- [ ] `localization` `key` index.

### A.5 Meta columns on every upsertable table
- [ ] `ingested_at INTEGER NOT NULL` on every entity table.
- [ ] `updated_at INTEGER NOT NULL` on every entity table.
- [ ] No table missing the meta pair without an explicit reason
      (cache tables are exempt — they have `fetched_at`).

### A.6 Runtime
- [ ] Drizzle client uses `drizzle-orm/bun-sqlite` and `bun:sqlite`.
      **NOT** `better-sqlite3`. **NOT** `node:sqlite`.
- [ ] Single `db` singleton exported from `packages/db/src/index.ts`.
- [ ] `migrate()` helper exported and runnable at boot.

### A.7 Migrations applied
- [ ] `bun --filter @sc-site/db drizzle-kit generate` produces
      migration files in `packages/db/migrations/`.
- [ ] Migrations apply cleanly to a fresh `data/sc.db`.
- [ ] `sqlite3 data/sc.db .tables` lists every entity from §A.8.

### A.8 The 27-table target (INGESTION.md §7)
- [ ] `vehicles`
- [ ] `items`
- [ ] `item_attributes`
- [ ] `commodities`
- [ ] `locations`
- [ ] `terminals`
- [ ] `jump_points`
- [ ] `shops`
- [ ] `price_snapshot`
- [ ] `refinery_methods`
- [ ] `refinery_yields`
- [ ] `commodities_routes`
- [ ] `blueprints`
- [ ] `item_crafts_into`
- [ ] `change_log`        ← MUST exist (the diff engine target)
- [ ] `component_damage_map`
- [ ] `loot_table`
- [ ] `loot_table_entry`
- [ ] `item_signature_coefficients`
- [ ] `localization`
- [ ] `source_override`
- [ ] `cache_http`
- [ ] `cache_large`
- [ ] `refresh_log`
- [ ] `fetch_lock`
- [ ] `schema_migrations`
- [ ] `game_version`

### A.9 File-size discipline
- [ ] No schema file > 400 lines. If `vehicles.ts` blows past, the
      JSON block typings should live in a side file.

### A.10 Reference parity (not a target, a sanity)
- [ ] Patterns we keep from
      `~/sc-site-eb3fe870-ghost/packages/db/src/schema/`:
      file-per-entity, `index.ts` barrel, `$inferSelect` re-exports.
- [ ] Patterns we drop: ceremony, dead columns, anything that smells
      like the old `vehicles_extras` spill (consolidated into JSON
      now).

---

## B. `packages/sc-data` — Zod schemas + fetchers + diff engine

### B.1 Central rate-limited HTTP client
- [ ] Exactly one HTTP client module
      (`src/http/client.ts` or similar) — every external call routes
      through it.
- [ ] No raw `fetch(` outside that module.
- [ ] Per-source rate limiter enforced. UEX = 115 req/min (5 head-
      room per `~/sc-site-old`'s `RateLimiter(115, 60_000)`).
- [ ] Wiki, erkul, cstone, sc-craft.tools each have their own
      politeness budget (250ms wiki, …) wired through the same
      client.
- [ ] Headers per source baked in: UEX uses
      `secret_key: ${UEX_API_TOKEN}`, **not** `Authorization: Bearer`.

### B.2 Cache-first, replay-friendly
- [ ] Every response is written to `cache_http` (or `cache_large`
      if > 20 MB) **before** parsing.
- [ ] Conditional GET: when the cached row has `etag` /
      `last_modified`, fetcher sends `If-None-Match` / `If-Modified-
      Since`. On `304`, refresh `fetched_at`, reuse body.
- [ ] Replay mode: a flag (env var or function arg) lets the
      fetcher run entirely from cache without hitting the network.
- [ ] Stale-ok read on 5xx / timeout: previous cached body is
      returned + entity flagged `data_freshness_warning`.
- [ ] Per-source TTLs from §4 are wired (UEX static 24h, prices 10m,
      Wiki 7d, erkul 7d, RSI 3d).

### B.3 Zod schema discipline
- [ ] UEX endpoints use `.passthrough()` (per-field strictness with
      tolerance for new fields the API may add). Numeric-string
      coercion for `is_*` ints and stringified numbers (per
      `SOURCES.md §1` known issues).
- [ ] Wiki schemas use `.passthrough()` (wiki adds fields without
      warning).
- [ ] Schemas live in `src/schemas/` per source and are exported as
      both runtime parsers and inferred TS types.
- [ ] Envelope shape for UEX: `{status: 'ok', http_code: 200,
      data: array | null}` parsed at the HTTP-client boundary, not
      re-parsed in every fetcher.

### B.4 Generic diff engine
- [ ] `src/diff/diff-row.ts` (or equivalent) is **generic over
      entity shape** — takes `(existing, incoming, source, ts)` and
      returns `ChangeLogRow[]`.
- [ ] No `if (entityType === 'vehicle')` branches inside the diff
      engine — the dotted-path walker is shape-agnostic.
- [ ] JSON columns: deep-equality at the leaf level, dotted path
      includes the JSON sub-key (`combat.shield_hp`, not just
      `combat`).
- [ ] Diff rows include `source` from the merge metadata, not
      hardcoded.
- [ ] Diff rows persisted in the **same transaction** as the entity
      upsert (no orphan log rows on crash).

### B.5 Strict layer separation
- [ ] `src/fetchers/*` — only HTTP. No DB. No transform.
- [ ] `src/transform/*` — pure functions. No HTTP. No DB. No I/O.
- [ ] `src/loaders/*` — only DB upserts. No HTTP. No transform
      logic.
- [ ] `src/aggregator/*` — orchestration: calls fetchers, hands
      results to transformers, hands canonical entities to loaders.
- [ ] No DB import in `fetchers/`. No `fetch(` import in
      `loaders/`. Enforced by file inspection.

### B.6 No hardcoded ship/item data
- [ ] No `const CARRACK = ...` or `const ANVIL_CARRACK = ...`
      anywhere.
- [ ] No "default loadout" object for any ship hardcoded — defaults
      come from erkul.
- [ ] The transformer maps fields from the parsed Zod result to the
      canonical shape; it does not invent missing fields with
      hardcoded defaults.
- [ ] Carrack-canonical-specs file is **research only** — none of
      its numbers (180000 shield, 70000 hull, 3275858 mass, uuid
      `f6d606c9-…`) appear as literals in any code file.

### B.7 Type flow without casts
- [ ] Inferred Zod types flow from the fetcher → transformer →
      canonical entity → DB upsert with **zero** `as any`, `as
      unknown as`, or `// @ts-expect-error`.
- [ ] The drizzle insert payload type is satisfied without casts.
- [ ] Public package exports include both the runtime parsers and
      inferred TS types so `apps/api` and `apps/web` can import
      either.

### B.8 File-size discipline
- [ ] No fetcher file > 400 lines.
- [ ] No loader file > 400 lines.
- [ ] No transform file > 400 lines.
- [ ] If one is bigger: flagged as "doing too much", split.

---

## C. `apps/api` — Hono routes

### C.1 Response shape matches the UI contract
- [ ] `apps/api/src/routes/vehicles.ts` returns rows whose shape is
      compatible with `packages/ui/src/sc/types.ts` `Ship` (i.e.
      `hardpoints: Hardpoint[]`, `damageResistance:
      DamageResistance`, etc.) — either by 1:1 alignment or via an
      explicit mapping layer.
- [ ] If a mapping layer exists, it lives in
      `apps/api/src/mappers/` (or `packages/types/`), not inline in
      the route handler.
- [ ] Every route returns canonical types via Drizzle
      `$inferSelect` re-exports — never a hand-rolled return type.

### C.2 Envelope consistency
- [ ] All routes return one of:
      `{ data: T, meta: { updated_at, source, freshness } }` or
      `{ vehicles: T[], meta: ... }` (consistent with the ghost
      reference). Not a free-for-all per route.
- [ ] Errors return `{ error: { code, message, request_id } }`.

### C.3 RPC type export
- [ ] `apps/api/src/index.ts` exports `AppType = typeof app`.
- [ ] `packages/types/src/client.ts` (or `apps/web/lib/api.ts`)
      builds an `hc<AppType>(NEXT_PUBLIC_API_URL)` client.
- [ ] `apps/web` consumers see typed responses end-to-end. No
      `await res.json() as Ship[]` casts anywhere.

### C.4 Thin handlers
- [ ] Route handlers are **at most ~30 lines**: parse params, call
      a function from `packages/sc-data` or `packages/db`, return.
- [ ] No Drizzle query builders inside route handlers — the query
      lives in a `repository` module under `packages/db` or
      `packages/sc-data`.
- [ ] No business logic in handlers (shield-merge, signature
      compute, IFCS compute live in `packages/sc-data` compute
      modules called from the handler).

### C.5 Error middleware
- [ ] Hono `app.onError(...)` returns structured 500 with a
      generated `request_id` (uuid v7 or nanoid).
- [ ] All caught errors go through a single logger so the
      `request_id` correlates request → log line.
- [ ] Unhandled rejections caught at the runtime level.

### C.6 Health endpoint
- [ ] `GET /health` returns `200 { status: 'ok', uptime, db_ok,
      version }`.
- [ ] Health check pings the DB (a `SELECT 1`).

### C.7 CORS
- [ ] `cors()` middleware allows `http://100.105.42.81:3000`,
      `http://localhost:3000`, plus a future-prod env-driven origin.
- [ ] No wildcard `*` in production.
- [ ] CORS headers tested by curl from the Pi to the API.

### C.8 Cron / scheduler
- [ ] `apps/api/src/cron/scheduler.ts` registers all jobs from
      `INGESTION.md §5` (refresh-static, refresh-prices, …).
- [ ] Each job uses `croner` with `protect: true`.
- [ ] Acquires `fetch_lock` rows; releases on success and on
      failure.
- [ ] Writes a `refresh_log` row per run (status=ok|fail,
      row_count, duration_ms).

---

## D. `apps/web` — rewire to API

### D.1 Mock data deletion
- [ ] `apps/web/lib/mock-data.ts` is DELETED **or** reduced to a
      single dev-only fallback gated behind
      `process.env.NEXT_PUBLIC_USE_MOCK === '1'` and never imported
      from a server component on the happy path.
- [ ] No remaining import of `mock-data` in any `app/**/page.tsx`
      file.
- [ ] `grep -rn 'mock-data\|mockData\|mockShips' apps/web/app
      apps/web/components` returns ZERO hits.

### D.2 Server components fetching from API
- [ ] `apps/web/app/(catalog)/ships/page.tsx` is a **server**
      component (no `'use client'` at the top).
- [ ] It calls the Hono RPC client, awaits typed `Ship[]`, passes
      to a UI component.
- [ ] Same for `apps/web/app/(catalog)/ships/[slug]/page.tsx` —
      server component, single RPC call by slug.
- [ ] No client-side fetch on initial page load.
- [ ] `fetch` calls (if any) use `cache: 'no-store'` or the Next.js
      `revalidate` API consciously, not by accident.

### D.3 Type flow clean
- [ ] No `any` in any page component.
- [ ] No `as Ship` cast — the RPC client return type already is
      `Ship`.
- [ ] If a `Pick<>`/`Omit<>` is needed for a list view, it lives
      in the page file, not in `packages/ui` (UI stays general).

### D.4 Graceful empty + error states
- [ ] API down → page renders a calm error state (Catppuccin Mocha,
      uses `--color-overlay0` text), not a stack trace.
- [ ] Empty result → calm "no ships match your query" using the
      same hairline panel pattern.
- [ ] No `<Suspense>` fallback that says "Loading..." — the static
      label rule from `MOCKUP.md §11` ("No 'loading spinners'. Use
      a static 'loading' label and let the canvas idle behind it").

### D.5 UI components untouched
- [ ] `packages/ui/src/sc/*` files are unchanged in this wave —
      only the wiring agent feeds them real data via props.
- [ ] No new component invented to "shape data for the UI" — that's
      the API mapper's job.

### D.6 Hangar subset is query-driven
- [ ] If the hangar shows a curated subset (e.g. `LIMIT 12`), the
      logic is `SELECT … ORDER BY … LIMIT 12` in the API, not
      `WHERE slug IN (...)`.
- [ ] No hardcoded slug whitelist anywhere in `apps/web`.

### D.7 MOCKUP.md §11 ban list (rendered HTML check)
Walk a `curl http://100.105.42.81:3000/ships > /tmp/ships.html` and
check the rendered DOM does not contain:
- [ ] No `<ShipCard>` grid (the hangar IS the catalog, no card grid).
- [ ] No "Explore the verse" / "Get started" / marketing CTA copy.
- [ ] No fake testimonials, no "Loved by N pilots".
- [ ] No `text-shadow:` glow.
- [ ] No "MISSION CONTROL" / "STATUS LED" / "ONLINE" hacker copy.
- [ ] No `tracking-[0.18em]` mono uppercase labels.
- [ ] No mentions of "Pedro", "tugakit", "42", "portfolio".
- [ ] No `<ScanLines>`, no `<CursorSpotlight>`, no
      `<Starfield>` DOM component.
- [ ] No gradient text.
- [ ] No bouncy easings — only `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- [ ] No top nav, sidebar, hamburger, breadcrumbs.
- [ ] No `font-mono` for body text.
- [ ] No infinite scroll markers.
- [ ] No `<dialog>` modal element.
- [ ] No light-theme CSS variable overrides.

### D.8 Less than 8% mauve
- [ ] Visual spot-check (CLAUDE.md hard constraint): mauve appears
      only on focus rings, the active filter chip, and the rim light
      hint. Not on large surfaces.

---

## E. Ingestion runner (wave 3)

### E.1 Initial populate
- [ ] After `bun run ingest` (or equivalent),
      `sqlite3 data/sc.db "SELECT COUNT(*) FROM vehicles"` returns
      ≈ 272 — the row count of `/tmp/uex-vehicles-raw.json`.
- [ ] `SELECT COUNT(*) FROM commodities` ≈ 191.
- [ ] `SELECT COUNT(*) FROM terminals` ≈ 824.
- [ ] `SELECT COUNT(*) FROM locations` > 500 (system + planet +
      moon + city + station + outpost combined).

### E.2 Refresh log
- [ ] `SELECT * FROM refresh_log ORDER BY started_at DESC LIMIT 1`
      shows `status='ok'` and `row_count` matches the populate.
- [ ] `duration_ms` is recorded.

### E.3 Idempotency
- [ ] Second run with no UEX changes → `SELECT COUNT(*) FROM
      change_log WHERE ts > <after_first_run>` returns **0**.
- [ ] Re-running does not duplicate rows in any table (`PRIMARY
      KEY` upserts work).
- [ ] No unique-constraint exceptions on second run.

### E.4 Logging hygiene
- [ ] No `console.log(` spam in the runner. All output via the
      logger module (pino, consola, or hand-rolled — but **one**
      module).
- [ ] Errors logged with structured fields (`{job, source, url,
      err}`).
- [ ] No `console.log(JSON.stringify(huge_payload))` debug leaks.

### E.5 Cron registration
- [ ] The runner can be invoked one-shot (CLI) AND from the
      scheduler (long-running) without code duplication.
- [ ] CLI flag for `--source uex,wiki,erkul` to refresh a subset.
- [ ] `--dry-run` flag that fetches + transforms + diffs but
      does not write.

---

## F. Overall quality bar

### F.1 Static analysis
- [ ] `bun run check` — Biome lint + format — **zero** warnings,
      **zero** errors across the entire monorepo.
- [ ] `bun run typecheck` — `tsc --noEmit -b` — **zero** errors
      across all `apps/*` and `packages/*`.
- [ ] No `// biome-ignore` or `// @ts-ignore` introduced in this
      wave.
- [ ] No `// eslint-disable` (the project uses Biome — eslint
      escape hatches should not exist).
- [ ] `tsconfig.base.json` strict flags unchanged: `strict`,
      `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

### F.2 Dev server runtime
- [ ] `bun run dev` boots both `apps/api` and `apps/web` (via
      monorepo orchestration — `concurrently`, `turbo`, `bun
      --filter`, …).
- [ ] `curl http://100.105.42.81:3000/ships` returns HTML with
      the real DB-fetched ship list (verified via `grep` for at
      least 3 distinct manufacturer names from the DB).
- [ ] `curl http://100.105.42.81:3000/api/health` (or wherever
      the API mounts) returns `200`.
- [ ] `curl http://100.105.42.81:3000/api/vehicles` returns JSON
      with > 200 rows (proves apps/web is hitting apps/api which is
      hitting the populated DB).

### F.3 No mock data on the wire
- [ ] The list of ship names returned by the API includes ships
      that are **not** in the old `mock-data.ts` (Carrack, Corsair,
      Cutlass Black, Aurora MR are all UEX-real, but the API should
      also return obscure ships like "Argo Mole", "MISC Razor",
      "Drake Cutty Steel" — proves the source is UEX, not the
      mock).
- [ ] The list count matches `/tmp/uex-vehicles-raw.json`'s row
      count, not `mock-data.ts`'s 4 fixtures.

### F.4 File-size sanity
- [ ] No fetcher file > 400 lines.
- [ ] No loader file > 400 lines.
- [ ] No schema file > 400 lines.
- [ ] No route handler file > 200 lines.
- [ ] No `apps/web/app/**/page.tsx` > 200 lines.
- [ ] If anything is bigger, the reviewer flags "probably doing
      too much".

### F.5 Carrack canonical spec respected (sanity-bait)
When the API is up, `curl /api/vehicles/carrack` and verify:
- [ ] `manufacturer` resolves to "Anvil Aerospace".
- [ ] `dimensions.length` ≈ 126.5 (UEX may report 123 — flag if
      so, but do not fail).
- [ ] `cargo.scu` = 456.
- [ ] No invented `wing_hardpoints` array, no `pilot_guns` array,
      no `chin_guns` array — Carrack has none of those (per
      `carrack-canonical-specs.md §Hardpoints`).
- [ ] No invented "CF-557" ballistic gatling — that whole error
      from the brief is not in the data.
- [ ] `weapon_snapshot.turrets` has 4 turrets with 2× S4 mounts
      each (or empty if upstream doesn't expose, but never wrong).
- [ ] `loaners` array (if exposed by UEX) does not invent ships.

### F.6 Scalability heuristics (Pedro's directive)
- [ ] Adding a new source = creating a fetcher + a transformer +
      registering them in the aggregator. **No** edits to the DB
      schema (unless the source brings genuinely new fields).
- [ ] Adding a new entity = one schema file + one fetcher + one
      transformer + one loader + one route. **No** edits to the
      diff engine, the rate limiter, the cache, or the UI scaffold.
- [ ] Changing the IFCS formula = editing one TypeScript function
      in `packages/sc-data/src/compute/ifcs.ts`. **No** migration.
      **No** UI edit.
- [ ] Doubling the ship count to ~600 = **no** code change. The
      catalog filter is in-process; the DB index is unique; the
      RPC is O(rows) on the wire.
- [ ] Adding a 7th language to localization = `git pull` a new
      repo + adding its name to a config map. No code per
      language.

---

## G. Files the reviewer will inspect (in order)

When START FINAL REVIEW lands, the reviewer walks these in order:

1. `/home/pedro/sc-site/packages/db/src/index.ts`
2. `/home/pedro/sc-site/packages/db/src/schema/*.ts` (every file)
3. `/home/pedro/sc-site/packages/db/drizzle.config.ts`
4. `/home/pedro/sc-site/packages/db/migrations/*` (count + names)
5. `/home/pedro/sc-site/packages/sc-data/src/http/*.ts`
6. `/home/pedro/sc-site/packages/sc-data/src/schemas/*.ts`
7. `/home/pedro/sc-site/packages/sc-data/src/fetchers/*.ts`
8. `/home/pedro/sc-site/packages/sc-data/src/transform/*.ts`
9. `/home/pedro/sc-site/packages/sc-data/src/loaders/*.ts`
10. `/home/pedro/sc-site/packages/sc-data/src/diff/*.ts`
11. `/home/pedro/sc-site/packages/sc-data/src/aggregator/*.ts`
12. `/home/pedro/sc-site/apps/api/src/index.ts`
13. `/home/pedro/sc-site/apps/api/src/routes/*.ts`
14. `/home/pedro/sc-site/apps/api/src/cron/scheduler.ts`
15. `/home/pedro/sc-site/apps/web/app/(catalog)/ships/page.tsx`
16. `/home/pedro/sc-site/apps/web/app/(catalog)/ships/[slug]/page.tsx`
17. `/home/pedro/sc-site/apps/web/lib/api.ts` (or wherever the
    RPC client lives)
18. `/home/pedro/sc-site/apps/web/lib/mock-data.ts` (must be
    deleted or downsized)
19. `/home/pedro/sc-site/packages/ui/src/sc/types.ts` (read-only —
    confirm UI contract not edited by wave agents)

Then runtime:
20. `bun run check`
21. `bun run typecheck`
22. `sqlite3 data/sc.db .tables`
23. `sqlite3 data/sc.db "SELECT COUNT(*) FROM vehicles"`
24. `sqlite3 data/sc.db "SELECT * FROM refresh_log ORDER BY id DESC LIMIT 5"`
25. `sqlite3 data/sc.db "SELECT COUNT(*) FROM change_log"`
26. `curl http://100.105.42.81:3000/ships | grep -ci 'manufacturer'`
27. `curl http://100.105.42.81:3000/api/vehicles | jq '.data | length'`
28. `curl http://100.105.42.81:3000/api/vehicles/carrack | jq .`
29. `grep -rn 'mock-data\|const CARRACK\|const CORSAIR' apps/ packages/`
30. `grep -rn 'as any\|@ts-ignore\|@ts-expect-error' apps/ packages/`

---

## H. Verdict template

Final message format (≤ 500 words):

```
SECTION A (packages/db) — PASS / FAIL
  - findings…
SECTION B (packages/sc-data) — PASS / FAIL
  - findings…
SECTION C (apps/api) — PASS / FAIL
  - findings…
SECTION D (apps/web) — PASS / FAIL
  - findings…
SECTION E (ingestion runner) — PASS / FAIL
  - findings…
QUALITY BAR (F) — PASS / FAIL
  - findings…

OVERALL: GO | ITERATE | REWRITE

If ITERATE, files to change:
  - /home/pedro/sc-site/packages/<...>
```

The bar for **GO**: every box in §0 hardcode hunt is clean, every
section A–E has **zero FAIL items**, the `bun run check` and
`bun run typecheck` runs are clean, and `curl /ships` proves real
DB data is on the wire.

The bar for **ITERATE**: < 10 fixable findings, no architectural
rework needed.

The bar for **REWRITE**: the layer separation is broken, hardcoded
data has slipped into a package, or the diff engine is entity-
specific. Pedro's directive is non-negotiable — these get a
REWRITE verdict.
