# sc-site — TODO

> ⚠️ **This file is now a BACKUP only.** The canonical source of truth is the Linear project `sc-site` (Mellow workspace, team key `MEL`).
>
> - **Linear project**: https://linear.app/mellow-workspace/project/sc-site-0a79ab3663c9
> - **Master doc**: https://linear.app/mellow-workspace/document/sc-site-context-stack-rules-references-a4445fe876c6
> - **All work tracked as Linear issues** (MEL-5 through MEL-43, 39 issues across 6 milestones as of 2026-04-08)
> - **Agents work against Linear** using the `linear` MCP (`mcp__linear__list_issues`, `mcp__linear__save_issue`, etc.)
>
> This file is kept as a local backup and human-readable roadmap snapshot. Do not edit it — edit Linear instead. Regenerate from Linear if it gets stale.

---

> Living document. Started 2026-04-07 after the research phase closed.
> Update as work progresses. Strike through completed items, don't delete them.

---

## 0. TL;DR — where we are, what to do first when you wake up

**Current phase**: research saturated, docs are 90% coherent, **zero code scaffolded** in this iteration (the `apps/` and `packages/` that exist on disk are ghost from the old eb3fe870 session and must be ignored — they live in `~/sc-site-eb3fe870-ghost/` now).

**The three project-authoritative docs on disk**:
- `docs/SOURCES.md` — 1169 lines, data source catalog
- `docs/INGESTION.md` — 1830 lines, ETL + schema strategy, 27 tables
- `docs/MOCKUP.md` — 1014 lines, design & interaction spec
- `docs/mockup.html` — 424 lines, static three.js visual proof (unchanged from team output)
- `docs/_research/` — Gemini + seed-sources + Garden Discord dumps (input material, do not edit)

**What to do first** (in order):
1. **Fix the 3 doc incoherences** in §1 below — they MUST be closed before any code scaffold, otherwise agents will implement dead endpoints
2. **Launch the scraping team** (§2) — full endpoint inventory of every source, in parallel agents
3. **Launch the Figma design team** (§3) — the huge multi-session job, design-first-code-second
4. **Only then**: code scaffold (§4)

---

## 1. Phase 1 — fix doc incoherences (BLOCKING)

The `sources-gap-fill` agent verified every Gemini claim against the live web on 2026-04-07 and burned down several phantom URLs that the other two agents had already written into `INGESTION.md` and `MOCKUP.md`. Those three references must be pivoted before the next phase.

### 1.1 — MOCKUP.md §3 Extension 2 — hardpoint markers source
**Problem**: the "Hardpoints as spatial marks on the mesh" subsection references `https://robertsspaceindustries.com/api/investigation/v1/ship/{id}` for weapon mount x/y/z coordinates. That endpoint returns 404 and is considered retired.

**Fix options** (pick one after investigation):
- **A.** Scrape erkul's internal JSON (there IS no public API but the web app loads data via XHR) — likely candidate because erkul shows hardpoints positions in its loadout UI, the data is client-side. Use Playwright MCP (`mcp__playwright__browser_network_requests`) to intercept the XHR that populates the hardpoint tree. Document endpoint in SOURCES.md.
- **B.** Parse `scunpacked-data` (`StarCitizenWiki/scunpacked-data` on GitHub) ship XML files — they contain `<Hardpoint>` nodes with local-space positions. Slow to parse, but authoritative.
- **C.** Downgrade the extension to "v2 once a source is found" and keep MOCKUP.md otherwise intact.

**Recommendation**: attempt A first (15 min with Playwright), fall back to B, then C.

**Files to edit after pivot**: MOCKUP.md §3 (the hardpoint subsection itself, ~lines 144-210) + SOURCES.md (add the erkul-internal or scunpacked hardpoint endpoint with full field shape) + INGESTION.md §1.b and §4 (add the hardpoint fetcher/unpacker step).

### 1.2 — INGESTION.md §4.7 Gap 7 — `.ctm` model fetcher
**Problem**: the ship model pipeline was planned around `https://robertsspaceindustries.com/media/{rsi_id}/source/ship.ctm`. That CDN path is retired — 404 on 4 real ship slugs verified.

**Replacement pipeline** (already partly documented by ingestion-gap-fill as the "fallback" path):
- **Capital ships**: mirror the 111 `.glb` assets hosted by `maps.adi.sc` (covers Idris, Perseus, Hammerhead, Reclaimer, Polaris, Starfarer, Carrack, Hercules, Starlancer + decks). Requires license clarification (see §5 open question below).
- **Small/medium ships**: no straightforward public source. Options:
  - Pedro datamines locally from his SC install with `unp4k` and scp's GLBs into `apps/web/public/ships/` (manual, slow, but authoritative).
  - Fall back to procedural placeholder meshes sized to real dimensions, tinted by manufacturer (already the "day-1 fallback" path per MOCKUP.md §10). Upgrade to real geometry progressively.

**Files to edit after pivot**: INGESTION.md §4.7 (rewrite the fetcher), §7 (drop `model_ctm_*` columns in `vehicles`, add `model_glb_path` + `model_source` enum), MOCKUP.md §10 (tighten the 3D model strategy section to match).

### 1.3 — INGESTION.md §1.e + §4.6 Gap 8 — localization source
**Problem**: the localization pipeline references `github.com/starcitizen-localization/` which doesn't exist. Gemini hallucinated the org.

**Replacement**: `StarCitizenWiki/scunpacked-data` bundles `labels.json` with all in-game strings in 5 languages (EN, FR, DE, ES, JP at least — verify). Zero new repo needed. Pull it from the same `git pull` as the main scunpacked-data sync.

**Files to edit after pivot**: INGESTION.md §1.e (change the `localization` table provenance note), §4.6 (change the fetcher step to read `labels.json` from the existing scunpacked checkout instead of cloning a separate repo), SOURCES.md §8 (add a paragraph under scunpacked-data noting that `labels.json` is the canonical localization source).

### 1.4 — Acceptance criteria for Phase 1
- [ ] MOCKUP.md contains zero references to `investigation/v1` (grep confirms)
- [ ] INGESTION.md contains zero references to `.ctm` as a primary path (keep as "historical note" if needed)
- [ ] INGESTION.md contains zero references to `github.com/starcitizen-localization`
- [ ] SOURCES.md, INGESTION.md, and MOCKUP.md all cross-reference consistently (e.g. if SOURCES.md §X says "Fix #1 endpoint is Y", INGESTION.md's matching gap should say the same)
- [ ] Run `grep -rE "investigation/v1|\.ctm|starcitizen-localization" /home/pedro/sc-site/docs/` — should return zero non-historical matches

---

## 2. Phase 2 — scraping team (parallel agents)

Goal: **full endpoint inventory and field-by-field schema for every source in SOURCES.md**. Every agent scrapes one (or a small cluster of) sources, produces a `~/sc-data/<slug>.json` snapshot, and writes a per-source addendum into a new `docs/_research/scrape-reports/<slug>.md` file.

### 2.1 — Scope rules for every scraping agent

Each agent must, for their assigned source:
1. Enumerate **every** endpoint (not just the ones SOURCES.md mentions — go hunting for undocumented ones via F12 network tab via Playwright, bundle inspection via `curl`, or public docs)
2. Capture a real response sample for each endpoint, saved to `~/sc-data/<source>-raw/<endpoint>.json`
3. Document the full response shape: every field name, type, nullability, and meaning (where derivable)
4. Note rate limits (via header inspection or empirical probing — be polite: 250 ms between requests to the same origin)
5. Note auth requirements (public, token, cookie, Cloudflare-gated)
6. Note license / ToS (so we know if we can mirror/cache)
7. Note freshness vs live patch (how often does the source update?)
8. Note what's UNIQUE about this source vs the others
9. Save a final report to `docs/_research/scrape-reports/<source>.md` with a consistent template
10. Do NOT modify `docs/SOURCES.md`, `docs/INGESTION.md`, or `docs/MOCKUP.md` — a reconciliation agent (§2.3) will merge findings back in.

### 2.2 — Per-source scraping agent assignments

Suggested parallel batches (respect the rate-limit etiquette — don't hammer one origin with multiple agents):

**Batch A (structured JSON APIs, friendly)**:
- `uex-2.0` — `https://api.uexcorp.space/2.0/` — every endpoint, verify Zod shapes match real data. Use the token in `~/sc-site-eb3fe870-ghost/.env` if needed (read-only). The previous team already verified this one is OK, but there are probably endpoints SOURCES.md doesn't list (e.g. `/commodities_raw_prices`, `/categories_hierarchy`).
- `sc-wiki-v3` — `https://api.star-citizen.wiki/api/v3/` — full endpoint dump, focus on `/vehicles/{slug}`, `/components/{type}`, `/commodities`, `/galactapedia`. Polite delay ~250ms.
- `rsi-starmap` — `https://robertsspaceindustries.com/api/starmap/*` (new discovery by sources-gap-fill) — 90 systems with xyz + affiliations + thumbnails.
- `rsi-ship-matrix` — `https://robertsspaceindustries.com/ship-matrix/index?` — cross-check against scunpacked-data. Cloudflare-friendly to curl from Pi.

**Batch B (SPA / JS-heavy, needs Playwright MCP)**:
- `erkul` — `https://erkul.games/` — **CRITICAL**: this is where hardpoint coordinates probably live. Use `mcp__playwright__browser_navigate` + `mcp__playwright__browser_network_requests` to capture every XHR when loading a ship page. Target: the internal loadout JSON. Document the endpoint pattern, headers required, response shape field-by-field.
- `cstone-finder` — `https://finder.cstone.space/` — same technique, extract the universal item data + shop inventories.
- `maps.adi.sc` — `https://maps.adi.sc/` — Playwright navigate, sniff network for the `.glb` URLs + any JSON backing data (component positions, deck layouts, fuse connections). Save the list of all 111 GLB URLs to `~/sc-data/adi-sc-glb-manifest.json`.
- `armory` — `https://armory.thespacecoder.space/` — sniff network for `/loot/*` endpoints. Document even if 401 — we want to know the path shape for the DM-the-author followup.
- `battlestations` — `https://battlestations.osiris-devworks.com/` — **extract the Vite bundle JSONs**. Use Playwright to download the main bundle, then extract the compiled-in 110 ship station-layout objects. Save to `~/sc-data/battlestations-layouts.json`.
- `rockbreaker` — `https://rockbreaker.peacefroggaming.com/` — sniff network. IGNORE any leaked API keys (don't reuse, but note the endpoints).
- `sc-cargo` — `https://sc-cargo.space/` — if there's a bundled data.json.

**Batch C (scrape + repo clone)**:
- `scunpacked-data` — clone `github.com/StarCitizenWiki/scunpacked-data` to `~/sc-data/scunpacked-data/`. Document the full directory tree. For each top-level dir, a one-paragraph "what this contains". Specifically catalogue: vehicles XML layout, item XML schemas, Loot_Table_Record, Container_Property, Vehicles/Damage/ (for Component Damage Map), and **find labels.json** (for localization Gap 8 fix). Verify multi-language coverage.
- `scmdb` — `https://scmdb.net/` — Playwright + curl combo. Blueprints, mission drops, loot. **HIGH PRIORITY** because it's the only source for crafting data currently.
- `sc-craft-tools` — `https://sc-craft.tools/` — blueprint DB, probably has a bundled JSON.
- `sc-4.7-mining-signals` — Google Sheet CSV export: `https://docs.google.com/spreadsheets/d/1n4qqOfwbtsOubUTMWJ532pBGoFbx567S/export?format=csv&gid=943032706`. Trivial.
- `regolith` — `https://regolith.rocks/` — auth-locked per sources-gap-fill. Just document that it's auth-locked, don't try to bypass.

**Batch D (static / image-only)**:
- `deltaconsultingsc` — Squarespace JPG charts, no structured API. Inventory the chart URLs, note the naming convention, save a manifest.
- `rsi-community-hub-cargo-grid` — single post with vehicle cargo grid PNGs. Scrape the image URLs.

### 2.3 — Reconciliation agent
After ALL batches finish, a final agent:
- Reads every `docs/_research/scrape-reports/<source>.md`
- Produces `docs/SOURCES.md` updates in a single coherent pass
- Produces `docs/INGESTION.md` adjustments where new sources affect the per-entity source priority
- Writes a top-level diff summary to `docs/_research/phase-2-reconciliation.md`

### 2.4 — Acceptance criteria for Phase 2
- [ ] Every source in `SOURCES.md` has a corresponding `docs/_research/scrape-reports/<slug>.md`
- [ ] Every source has a raw sample saved under `~/sc-data/<slug>-raw/`
- [ ] `labels.json` is located and its path documented (unblocks Phase 1 fix 1.3)
- [ ] The erkul hardpoint endpoint is either found and documented, or confirmed not to exist (unblocks Phase 1 fix 1.1)
- [ ] `SOURCES.md` is updated with any newly discovered endpoints
- [ ] `INGESTION.md` per-entity source priority tables are updated if rankings change

---

## 3. Phase 3 — Figma design system + per-page design (multi-session, big work)

**Goal**: every page, every component, every millimeter of the site exists in Figma BEFORE any UI code is written. The code becomes a pure translation of the Figma source of truth.

**Who drives this**: you, with a dedicated `figma-designer` agent that uses the Figma MCP (`mcp__figma__get_figma_data`, `mcp__figma__download_figma_images`) to READ your designs and translate them to React/Tailwind. You will CREATE the designs in Figma yourself (or with another Claude session that can use the Figma API directly, separate from the sc-site work).

**Why design-first**: the current `docs/mockup.html` is a static single-page proof. It doesn't cover the full page inventory. Building in Figma first gives:
- Component library reusability (one Button, one Input, one Chip — used everywhere)
- Variants for states (hover, focus, disabled, loading, empty, error)
- Responsive breakpoints visualized
- Tokens that the code imports directly (Tailwind v4 `@theme` block generated from Figma tokens)

### 3.1 — Design system (do first, blocks 3.2)

Tokens:
- [ ] Color tokens — Catppuccin Mocha extended (base, mantle, crust, surface0-2, overlay0-2, subtext0-1, text, rosewater, flamingo, pink, mauve, red, maroon, peach, yellow, green, teal, sky, sapphire, blue, lavender)
- [ ] Typography tokens — Inter (300/400/500/600/700), JetBrains Mono (400/500/600/700), Orbitron (500/600/700/800/900), with the exact type scale from MOCKUP.md §7
- [ ] Spacing scale (from MOCKUP.md §7.spacing — 4, 8, 12, 16, 24, 32, 48, 64, 96)
- [ ] Radius scale (2, 4, 6, 8 — per MOCKUP.md §7.radius)
- [ ] Border widths + colors (hairline mauve, 1px surface0, etc.)
- [ ] Elevation/shadow tokens (minimal — MOCKUP.md §8 bans heavy shadows)
- [ ] Motion tokens (120, 180, 220, 600, 900 ms + the single cubic-bezier(0.2, 0.8, 0.2, 1) easing per MOCKUP.md §9)

Component library:
- [ ] Button (variants: primary/secondary/ghost/danger, sizes: sm/md/lg, states: default/hover/active/focus/disabled/loading)
- [ ] Input (text, search, number) + states
- [ ] Chip — THE filter chip from the query rail, with 2-letter source badge + value + close button
- [ ] Panel (inline expansion variant, side drawer variant, modal-less detail variant)
- [ ] Table (compact data table for specs — per MOCKUP.md §4 ship detail)
- [ ] Card (ship card, item card — minimal, mauve edge glow on hover)
- [ ] Tooltip hairline (NOT a floating tooltip — the inline callout style from `mockup.html` `.panel-hairline`)
- [ ] Top nav (the slim filter rail + time clock)
- [ ] Bottom-right text nav (per `mockup.html`)
- [ ] 3D canvas placeholder (for the hangar overview + ship detail hero — rectangle with a "canvas" label)
- [ ] Query rail (the horizontal row of chips above the 3D scene)
- [ ] Damage-resistance strip (the 5-row stacked bar from MOCKUP.md §4 ship detail)
- [ ] History drawer (the patch timeline panel — empty state + populated state)
- [ ] Starfield / ScanLines / CursorSpotlight overlay placeholder (design-level: note "rendered in code, not in Figma", but document the visual effect)
- [ ] Status LED (from existing sc-site-eb3fe870-ghost components — the small colored dot indicator)

### 3.2 — Per-page designs (after 3.1)

For each route in `docs/MOCKUP.md` §4, design:
- Desktop default view
- Mobile breakpoint
- Empty state
- Loading state
- Error state
- Focused state (for interactive pages)

Routes to design (in priority order):

1. [ ] `/` — hangar entry (= `/ships`, no landing). Desktop 3D scene with query rail, ship labels overlaid, bottom-right text nav. Mobile: vertical ship list with mini 3D hero at top.
2. [ ] `/ships/[slug]` — ship detail. Hero (ship mesh + hardpoint markers), specs tabs (combat / mobility / dimensions / economy), damage-resistance strip, history drawer, loadout browser placeholder.
3. [ ] `/map` — Stanton 3D system view. 3D canvas + system tree side panel + jump point overlay.
4. [ ] `/trade` — route planner. Input form (buy at / sell at / ship) + result list with hairline dividers. Mobile: stacked.
5. [ ] `/mining` — prospector tool. Rock breaker panel + resource signature scanner input + result cards.
6. [ ] `/weapons` — reference page. Dense spec table + filter rail.
7. [ ] `/components` — reference page. Same as weapons, different data.
8. [ ] `/loadout/[slug]` — optional, stretch. Loadout editor with drag-drop slots.

### 3.3 — Figma-to-code workflow (once designs exist)
- A `figma-to-code` agent reads the Figma file via `mcp__figma__get_figma_data`
- Produces React components under `apps/web/components/` that match the Figma nodes 1:1 (or as close as possible)
- Generates Tailwind classes from Figma styles (the Figma MCP already simplifies this for LLM consumption)
- The code becomes a thin translation layer, not an interpretation

### 3.4 — Acceptance criteria for Phase 3
- [ ] Every token in the design system has a Figma variable
- [ ] Every component in §3.1 has a Figma component with variants
- [ ] Every page in §3.2 has at least the desktop + mobile + empty states designed
- [x] The Figma file URL is saved in this TODO.md for agent access
- [ ] A Tailwind v4 `@theme` block can be generated from the Figma tokens and committed to `apps/web/app/globals.css`

### 3.5 — Figma file
- **URL**: https://www.figma.com/design/XHM9Qj7mtaV62lfWZfAKWq/Untitled
- **File key**: `XHM9Qj7mtaV62lfWZfAKWq`
- **State (2026-04-07)**: empty canvas, `Page 1` only. No frames, components, or styles yet.
- **Access**: Pedro's personal Figma account. Agents use `mcp__figma__get_figma_data` with the file key above to read, and `mcp__figma__download_figma_images` to export.

---

## 4. Phase 4 — code scaffold (blocked by Phase 1, partial by Phase 3)

Don't start until Phase 1 is CLOSED and Phase 3 has at least the design system + the `/` and `/ships/[slug]` pages designed.

### 4.1 — Repo structure (locked, per sc-site-eb3fe870-ghost's CLAUDE.md vision + the INGESTION.md updates)

```
sc-site/
├── apps/
│   ├── web/                    # Next.js 15 App Router
│   └── api/                    # Hono on Bun
├── packages/
│   ├── db/                     # Drizzle schema + migrations + client
│   ├── ui/                     # Shared React components (Figma-generated)
│   ├── sc-data/                # Data fetchers + Zod schemas
│   └── types/                  # Hono RPC types shared with web
├── data/
│   └── sc.db                   # SQLite (gitignored)
├── docs/                       # Everything from the research phase
├── biome.json
├── package.json                # Bun workspaces root
├── tsconfig.base.json
├── CLAUDE.md                   # Project context for agents
└── TODO.md                     # This file
```

### 4.2 — Scaffold steps (in order)
- [ ] `bun init` at root + `package.json` with workspaces
- [ ] `biome init` + copy the style from sc-site-eb3fe870-ghost (2-space, single quotes, trailing comma, arrow parens as-needed)
- [ ] Scaffold `packages/db` with Drizzle — schema per `INGESTION.md` §1 (the 27 canonical tables)
- [ ] Scaffold `packages/sc-data` with Zod — schemas per `SOURCES.md` (regenerate from scrape reports §2)
- [ ] Scaffold `packages/ui` with the Figma-generated components
- [ ] Scaffold `apps/api` with Hono — routes per `INGESTION.md` §API (catalog, prices, search, map, tools, admin, user)
- [ ] Scaffold `apps/web` with Next.js 15 — pages per the Figma designs, wiring Hono RPC client for type-safe API calls
- [ ] Tailwind v4 `@theme` block generated from Figma tokens
- [ ] Three.js integration for the hangar scene
- [ ] Vitest setup + a few smoke tests
- [ ] Systemd units for `sc-site-api.service` and `sc-site-web.service` (per sc-site-eb3fe870-ghost/CLAUDE.md §Deployment)

### 4.3 — Acceptance criteria for Phase 4
- [ ] `bun run dev` starts both web (:3000) and api (:3001) simultaneously
- [ ] `bun run build` succeeds for both
- [ ] `bun run check` (biome) returns zero warnings/errors (strict compilation per feedback)
- [ ] `http://100.105.42.81:3000/` redirects to `/ships` and renders the 3D hangar placeholder with the query rail
- [ ] `http://100.105.42.81:3001/ships` returns real data from a seeded SQLite

---

## 5. Phase 5 — ingestion pipeline (parallel with 4)

Build the actual fetchers, unpackers, transformers, loaders per `docs/INGESTION.md`:
- [ ] UEX fetcher (reuse Zod shapes from sc-site-eb3fe870-ghost/packages/sc-data/src/schemas.ts as starting point)
- [ ] scunpacked-data fetcher (git clone + XML parser)
- [ ] erkul scraper (via Playwright if it's an SPA)
- [ ] cstone scraper
- [ ] maps.adi.sc mirror (with license compliance — see §7 below)
- [ ] labels.json importer (fast — JSON parse + upsert)
- [ ] change_log diff engine (field-level audit during upserts)
- [ ] Cron scheduler (systemd timer OR Croner library per sc-site-eb3fe870-ghost pattern)
- [ ] Refresh logs table + admin UI to view last N runs

---

## 6. Opportunities to investigate (from the research phase)

### 6.1 — Armory `/loot/probabilities`
Same author as Hauler (which you already use). The endpoint is 401-locked but sources-gap-fill suggested a DM to the author could unlock access. This would give us crowd-sourced drop rates — data literally nobody else has publicly. If the author agrees, we get the Gemini "truc lourd" for free.

**Action**: contact the author via the Garden Discord or Hauler's site. Explain the project (personal SC companion site, not commercial). Ask for read access or at least for the endpoint shape documentation.

### 6.2 — maps.adi.sc 111 .glb assets
Solves the 3D model pipeline for capital ships. **But** the license is undocumented. Do NOT hotlink from their CDN — mirror locally AND credit ADI visibly on the site (e.g. a `/credits` page + a small ADI attribution on the ship detail page when the mesh is from their collection).

**Action**: (a) contact ADI via Discord to clarify license, (b) mirror the 111 GLBs to `apps/web/public/ships/<slug>.glb`, (c) add a `credits` field to the `vehicles` table indicating the geometry source.

### 6.3 — Battlestations Vite bundle
110 ship station-layout JSONs compiled into the JS bundle. Extract before the author ships the "coming soon" API — we get the data now, and can update later when the API lands.

**Action**: Playwright navigate to battlestations, download the main JS chunk, use a sourcemap or regex extraction to pull the embedded JSON. Save to `~/sc-data/battlestations-layouts.json`. License: unclear, same attribution strategy as maps.adi.sc.

### 6.4 — Rockbreaker leaked dev key
Do NOT reuse the leaked `starcitizen-api.com` key. But the leak confirms `/v1/live/stats` is a real endpoint — we can document this path and pursue official access if needed. This is informational only, no code action.

### 6.5 — RSI `/api/starmap/*` (newly discovered)
sources-gap-fill found this in §9a.1: `/api/starmap/star-systems` (80 KB, 90 systems with xyz + affiliations + thumbnails), `/star-systems/{CODE}` (30 KB detail), `/bootup` (148 KB). It's already in SOURCES.md, but not yet in the INGESTION.md per-entity priority list. Merge it in during the Phase 2 reconciliation agent.

### 6.6 — SPViewer for signature coefficients
INGESTION.md's Gap 6 added `item_signature_coefficients` table. SOURCES.md marks SPViewer as "skipped". If erkul doesn't expose `c_ir`/`c_em`/`c_cs` (to be verified by the Phase 2 erkul agent), then SPViewer becomes the ONLY source and must be un-skipped.

**Blocker**: depends on Phase 2 erkul scrape result.

---

## 7. Open questions / risks

- **Hardpoint coordinates**: if erkul's internal JSON doesn't have them AND scunpacked-data's XML parsing is too slow/lossy, Extension 2 (hardpoint markers) downgrades to v2 or gets cut.
- **maps.adi.sc license**: unclear. May prevent mirror → Pedro would have to datamine GLBs manually. Contact ADI before committing to the feature.
- **Armory access**: 401 today. DM may or may not unlock. Loot tables are the single biggest differentiator but we can't rely on them for v1.
- **SCMDB scraping feasibility**: their terms may prohibit scraping. Verify during Phase 2.
- **Blueprint quality curves**: the exact schema is complex (quality-curve modifiers per ingredient slot). sc-craft.tools is the reference but its data shape is undocumented.
- **Bun on Raspberry Pi ARM64**: verified works (v1.3.11 installed) but native deps (sharp, unrs-resolver) must build from source. Allow extra build time.
- **Cross-compilation**: confirmed broken for Bun + native deps, per sc-site-eb3fe870-ghost/CLAUDE.md. Build directly on the Pi via SSH.

---

## 8. Done / archived

### Research phase (2026-04-07)
- [x] Recovered the ghost scaffold from eb3fe870 session → isolated to `~/sc-site-eb3fe870-ghost/`
- [x] Confirmed the previous team (session e695584a) produced 4 substantive docs: SOURCES.md (790L), INGESTION.md (1283L), MOCKUP.md (791L), mockup.html (424L)
- [x] Absorbed the Garden Discord dump (community tools, 2021–2026) as `docs/_research/garden-discord-tools-2021-2026.md`
- [x] Launched 3 parallel gap-fill agents:
  - [x] `sources-gap-fill`: SOURCES.md 790→1169 (+379), promoted scunpacked-data to first-class, killed 5+ Gemini phantom URLs, discovered RSI /api/starmap + Armory /loot + maps.adi.sc 111 glbs + Battlestations Vite bundle 110 layouts + scunpacked-data bundles labels.json
  - [x] `ingestion-gap-fill`: INGESTION.md 1283→1830 (+547), tables 18→27, closed 9/9 gaps, added change_log, component_damage_map, loot_table, blueprint v1, IFCS derived fields, signature_coefficients, .ctm fetcher (now stale), localization (now stale), atmosphere_json
  - [x] `mockup-patch`: MOCKUP.md 791→1014 (+223), added damage-resistance strip (picked bar over radar), hardpoint markers subsection (now stale), history drawer, integrated maps.adi.sc reference
- [x] MCPs installed in user scope (global, work from any cwd):
  - [x] `figma` — Framelink Figma MCP v0.8.1, personal access token stored in `~/.claude.json`
  - [x] `context7` — Upstash Context7, zero-config library docs
  - [x] `playwright` — official Playwright MCP + chromium-headless-shell 147 downloaded to `~/.cache/ms-playwright/`
- [x] Removed dead `star-citizen` MCP (python3 /home/pedro/sc-data/server.py was a sc-bot reliquary)
- [x] Cleaned the docs directory: only `docs/` remains in `sc-site/`, everything else (apps/, packages/, package.json, biome.json, etc.) moved to `~/sc-site-eb3fe870-ghost/`

---

## 9. Never — hard rules

These are non-negotiable per MOCKUP.md + project feedback:

- NO marketing landing page, NO hero section, NO CTAs, NO "Sign in / Launch / Get started"
- NO personal mentions (no "Pedro", no "42", no "tugakit", no "portfolio")
- NO AI slop: no fake quotes, fake author names, fake testimonials, fake stats
- NO emojis in design artifacts or shipped content
- NO neon cyan (`#00d9ff`) or hot pink (`#ff0080`) — Catppuccin Mocha mauve only
- NO red/green alarmist colors for UI data viz
- NO modals — everything is inline expansion or side panel
- NO floating tooltips — hairline inline callouts per mockup.html
- NO sound effects
- NO "revolutionary", "powerful", "next-gen", "unleash", "unlock", "seamlessly", "world-class" or similar marketing vocabulary anywhere in design docs or UI copy
- NO cross-compilation of native deps — build on the Pi directly

---

## 10. Contacts / references

- **Figma file (empty, ready for design work)**: https://www.figma.com/design/XHM9Qj7mtaV62lfWZfAKWq/Untitled (file key `XHM9Qj7mtaV62lfWZfAKWq`)
- **Framelink Figma MCP docs**: https://www.framelink.ai/docs/quickstart
- **Context7 docs**: https://github.com/upstash/context7
- **Playwright MCP**: https://github.com/microsoft/playwright-mcp
- **scunpacked-data**: https://github.com/StarCitizenWiki/scunpacked-data
- **UEX 2.0 docs**: https://uexcorp.space/api/documentation/
- **SC Wiki v3**: https://api.star-citizen.wiki
- **Garden Discord source dump**: `docs/_research/garden-discord-tools-2021-2026.md`
- **Gemini architecture seed**: `docs/_research/gemini-architecture.md` (reference only, heavily stale per sources-gap-fill verification)
- **Seed sources (authoritative for Pedro's knowledge)**: `docs/_research/seed-sources.md`
