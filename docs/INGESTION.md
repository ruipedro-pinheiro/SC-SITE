# sc-site — Data Ingestion Strategy

> Owner: `ingestion` teammate. Companion doc to `SOURCES.md` (source catalog) and
> `MOCKUP.md` (UI design). This doc defines *how* data gets into `sc.db`, *which*
> source wins per field, and *what* the final canonical shapes look like.

## 0. Guiding principles

Pedro's direction (verbatim):

> "Je veux pas 1000000 tables/db, je veux un truc bien foutu, si j'ai des ships
> je veux savoir TOUT. Évite de dépendre de UEX ou autre, mais hésite pas à t'en
> servir et surtout à trouver LA manière de prendre un max d'infos au plus efficace"

Translated to engineering constraints:

1. **Consolidated schema.** The prior `sc-site-old` had 28 tables. This design
   lands at 27 (see §1 and §7) by applying a strict consolidation rule: if two
   "tables" are always read together and have 1:1 cardinality with the parent,
   they become a JSON column on the parent row, not a side table. Split only
   for genuine N:M (vehicle_weapons, item_attributes), independently queryable
   rows (prices history, change log), or data with its own query shape
   (component damage, loot tables, per-language localization strings). The
   total count is flat, but the composition is decisively different: gone are
   the 10 redundant location/price sub-tables; added are 9 new tables that
   unlock differentiator queries no existing SC tool answers.
2. **Maximum richness for ships.** Every spec, every hardpoint, every stat,
   every hull HP region, every item variant, loadout, lore, images, videos.
   Nothing dropped just because it's awkward to model.
3. **No single point of failure.** UEX is the current best live-economy source
   but the site must *degrade, not die* if UEX goes down. Wiki, RSI
   ship-matrix, erkul, and local snapshots form a resilient mesh.
4. **Efficient pulling.** Bulk endpoints first, per-id fallback second,
   scrapes last. Every HTTP response cached to disk before being processed,
   so a re-run never re-downloads an unchanged payload.
5. **Canonical DB, not a scraper pipeline.** Web and API never touch external
   HTTP. They read SQLite. Cron refills SQLite from sources on a schedule.

## 1. Canonical entity list

Deliberately small. Eight top-level entities cover every SC tool Pedro wants:

| Entity        | What it is                                             | Estimated rows |
|---------------|--------------------------------------------------------|----------------|
| `Vehicle`     | Ships + ground vehicles (single table, flag-separated) | ~310           |
| `Item`        | Every loadout/attachable item: weapons, shields, qdrives, coolers, power plants, missiles, mining lasers, scrapers, modules, utilities, FPS gear | ~4 500 |
| `Commodity`   | Tradables, refinables, mineables                       | ~200           |
| `Location`    | Unified tree: system → planet → moon → city → station → outpost → poi | ~900 |
| `Terminal`    | A point where you trade/refuel/repair. Belongs to one Location. | ~820 |
| `JumpPoint`   | Pairwise edge between two systems                      | ~30            |
| `Shop`        | Retail aggregation of (Terminal, Item/Vehicle, price). Separate from trade commodity prices. | ~25 000 |
| `Blueprint`   | Crafting recipe (blueprint → ingredient slots → quality curves → mission drop sources). **v1 scope — promoted from v2 because of alpha 4.7 crafting.** | ~1 040 |

Support entities (not top-level, not user-facing as pages):

- `PriceSnapshot` — append-only prices history (commodity + item + vehicle + fuel unified)
- `RefineryYield` — commodity × method yield
- `CacheHttp` — raw HTTP response cache (Tier-2 cache, see §4)
- `RefreshLog` — job run audit, **run-level** (one row per refresh job run)
- `ChangeLog` — **field-level** audit (one row per changed value). Complementary to `RefreshLog`, not redundant. Powers the "patch notes for this ship" UX (§1.a).
- `ComponentDamageMap` — per-component physical damage resistance curve. The "psychopath differentiator" — no other SC tool exposes this (§1.b).
- `LootTable` + `LootTableEntry` — container/mission → item drop tables with probabilities. Optional v2 scope, difficulty honestly flagged (§1.c).
- `ItemSignatureCoefficients` — per-component IR/EM/cross-section multipliers, used to compute ship-level signatures additively (§1.d).
- `Localization` — multi-language strings keyed on CryEngine string keys (`@item_power_plant_S1` → "S1 Power Plant" / "Générateur S1" / …). Makes the DB multi-language for free (§1.e).
- `SourceOverride` — manual correction table for individual fields (see §3)

Entities deliberately NOT split into their own tables (were separate in the old
schema, now subsumed):

- `vehicles_extras` → merged into `Vehicle` via JSON columns (`combat_json`,
  `mobility_json`, `dimensions_json`, `lore`)
- `vehicles_purchases_prices`, `vehicles_rentals_prices`, `items_prices`,
  `commodities_prices`, `commodities_prices_history`, `fuel_prices` → unified
  into a single `PriceSnapshot` (polymorphic on `subject_kind`)
- `planets`, `moons`, `cities`, `space_stations`, `outposts` → single
  `Location` table with `kind` column and a `parent_id` self-reference
- `vehicles_loaners` → moved into `Vehicle.loaners_json` (array of vehicle ids)
- `items_attributes` → kept as a side table because of true N:M

**Old count: 28. New count: 27.** Breakdown (full precise list in §7):
- **8 core entities** (user-facing pages): Vehicle, Item, Commodity, Location, Terminal, JumpPoint, Shop, Blueprint.
- **9 deep-support tables** (queryable, joined into core entities): ItemAttribute, PriceSnapshot, ChangeLog, ComponentDamageMap, LootTable, LootTableEntry, ItemSignatureCoefficients, Localization, ItemCraftsInto.
- **10 utility tables**: RefineryMethods, RefineryYields, CommoditiesRoutes, RefreshLog, SourceOverride, CacheHttp, CacheLarge, FetchLock, SchemaMigrations, GameVersion.

That's **−10 redundant tables** (5 location sub-tables + 5 price sub-tables) and **+9 new tables** that unlock differentiator queries no existing SC tool answers (change_log, component_damage_map, loot_table, loot_table_entry, item_signature_coefficients, localization, item_crafts_into, blueprints, game_version). The win is not "fewer tables" — it's "the right tables, no `planets`/`moons`/`cities`/`stations`/`outposts` ceremony, plus the additive tables that make this DB unique".

### 1.a `change_log` — field-level audit trail

```sql
CREATE TABLE change_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           INTEGER NOT NULL,       -- unix ms
  entity_type  TEXT    NOT NULL,       -- 'vehicle' | 'item' | 'shop' | 'commodity' | 'location' | 'blueprint'
  entity_uuid  TEXT    NOT NULL,       -- canonical slug or uuid
  field        TEXT    NOT NULL,       -- dotted path, e.g. 'combat.shield_hp', 'mobility.scm'
  old_value    TEXT,                   -- JSON-stringified (null if first write)
  new_value    TEXT,                   -- JSON-stringified
  source       TEXT    NOT NULL        -- 'uex' | 'wiki' | 'erkul' | 'cstone' | 'sc-craft' | 'scunpacked' | …
);
CREATE INDEX idx_change_log_entity ON change_log(entity_type, entity_uuid);
CREATE INDEX idx_change_log_ts     ON change_log(ts DESC);
```

**Relationship to RefreshLog:** `RefreshLog` is **run-level** — one row per ingestion job run (job name, duration, status, rows_updated count). `ChangeLog` is **field-level** — one row per value that actually moved. Complementary, not redundant: you join them on `ts` ± a small window to answer "what changed in the refresh-erkul run at 03:30 last Sunday?".

**Diff computation (Transformer layer).** During each entity upsert the Transformer already reads the existing row (for the "skip if nothing changed" optimization in §8). Extend that read to produce a field-level diff: walk the canonical shape flattened to dotted paths, compare `old.path` vs `new.path` with deep equality on JSON columns, and emit a `change_log` row per non-equal leaf. The Transformer already knows the `source` that produced each field (from the source-priority merge), so the `source` column is populated for free. Run inside the same transaction as the entity upsert so a crash never produces orphan log rows.

**UX payoff.** Frontend renders "Patch notes for this ship" on `/ships/:slug`: a timeline panel listing "2026-04-03 — `combat.shield_hp` 15000 → 17500 (erkul)", "2026-03-28 — `mobility.scm` 220 → 235 (erkul)", etc. **No other SC tool exposes this.** The same query powers a per-patch rollup ("what changed in 4.7.0?") on a global `/changelog` page — a direct answer to Gemini's pitch ("la seule façon d'avoir une DB qui suit l'évolution du jeu à 100%"). Pedro gets this basically for free because the Transformer is already doing a diff; we just persist it instead of throwing it away.

**Retention.** Keep forever. Size estimate: 310 ships × ~30 field changes per patch × 12 patches/year ≈ 110k rows/year at ~250 bytes/row ≈ **30 MB/year**. Items add another ~100k rows/year (4 500 items × ~3 changed fields × 6 partial patches). Full first-year budget ≈ 50 MB, which is acceptable on the Pi's SSD. Shops and prices are explicitly excluded from change_log (they already have `PriceSnapshot` as their append-only audit — routing them through change_log would blow the size estimate by 100x and duplicate information).

**Refresh class:** live — written synchronously inside every static/mid/live refresh job's aggregator transaction.

### 1.b `component_damage_map` — per-component damage resistance

```sql
CREATE TABLE component_damage_map (
  component_uuid    TEXT    NOT NULL,   -- FK to items.uuid
  damage_type       TEXT    NOT NULL,   -- 'Physical' | 'Distortion' | 'Energy' | 'Thermal' | 'Biochemical'
  multiplier        REAL    NOT NULL,   -- damage taken multiplier (1.0 = neutral, <1 = resistant, >1 = weak)
  health_threshold  REAL,               -- HP threshold below which the multiplier applies (nullable = always)
  PRIMARY KEY (component_uuid, damage_type),
  FOREIGN KEY (component_uuid) REFERENCES items(uuid)
);
CREATE INDEX idx_component_damage_type ON component_damage_map(damage_type);
```

**Source:** `Vehicles/Damage/` folder in the `scunpacked` / `sc-unpacked-data` repo, which re-publishes the `.xml` damage descriptors from `Data.p4k` in JSON form. One JSON file per component class — each one contains a `DamageResistance` block with per-type multipliers. This is currently consumed by *no* public SC tool, per Gemini's dump. If `scunpacked` doesn't expose it directly, the fallback is a `unp4k` one-shot extraction pass (documented in SOURCES.md §9) run off-Pi.

**Unique query unlocked:** *"Given weapon X (damage_type='Energy'), which ship has the most total effective HP against it?"* — answered by joining ships → their installed components (via `Vehicle.loadout_json` default items) → `component_damage_map` filtered to `damage_type='Energy'` and summing `components.hp × (1/multiplier)`. No existing SC tool answers this question. Erkul computes shield-DPS time-to-kill; this goes a level deeper — **component-level physical resistance independent of shields**. That's a hardcore combat-engineering query.

**Ship-level aggregation.** The "resistance profile" shown on the ship detail page is computed as a **weighted average by internal component HP**, not a max or min. Specifically:

```
ship.resistance[damage_type] =
  Σ (component.hp × component_damage_map[component.uuid][damage_type].multiplier)
  ÷ Σ component.hp
```

Weighted average chosen because it matches what actually happens in a fight: a small fragile sensor with heavy resistance contributes proportionally less than a huge fragile fuel tank with normal resistance. Max-of would misleadingly rank ships with one overbuilt component as "tanky everywhere"; min-of would punish ships for a single soft component. The weighted mean is a reasonable proxy for "average damage taken across a sustained engagement". This computation lives in the Hono API at read time (same pattern as §4.5 IFCS), so changing the formula doesn't require a migration.

**Refresh class:** static — repopulated on game version bump via `version-watch` triggering a `refresh-scunpacked` run. Component damage curves only change when CIG rebalances, which happens roughly once per patch.

**Rationale (≤3 sentences):** Closes Gemini's "niche absolute" differentiator. Makes sc-site the only tool that can answer "which ship survives THIS specific weapon best". Almost free to ship because the source data is already public in `sc-unpacked-data` — we just have to parse and index it.

### 1.c `loot_table` + `loot_table_entry` — mission/container drop tables (optional v2)

```sql
CREATE TABLE loot_table (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id      TEXT,                 -- nullable: some containers are not mission-gated (ambient world loot)
  container_id    TEXT NOT NULL,        -- e.g. 'bunker-arccorp-bravo-crate-01'
  container_label TEXT NOT NULL,        -- human-readable, e.g. 'ArcCorp Bunker Bravo — Armoury crate'
  source          TEXT NOT NULL         -- 'scmdb' | 'sc-unpacked-data' | 'scraped' | 'manual'
);
CREATE TABLE loot_table_entry (
  loot_table_id   INTEGER NOT NULL,
  item_uuid       TEXT    NOT NULL,     -- FK to items.uuid
  probability     REAL,                 -- 0..1 if known, null otherwise
  min_qty         INTEGER NOT NULL DEFAULT 1,
  max_qty         INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (loot_table_id, item_uuid),
  FOREIGN KEY (loot_table_id) REFERENCES loot_table(id) ON DELETE CASCADE,
  FOREIGN KEY (item_uuid)     REFERENCES items(uuid)
);
CREATE INDEX idx_loot_entry_item ON loot_table_entry(item_uuid);
```

**Sources in priority order:**
1. **SCMDB** (`scmdb.net`) — Pedro's seed-sources.md calls this out explicitly as "indispensable depuis l'alpha 4.7" for mission → loot lookups. SOURCES.md §1 of the sources gap-fill should document whether SCMDB exposes a JSON API or only HTML (Playwright scrape fallback).
2. **`sc-unpacked-data` / scunpacked** — Gemini's recommendation is to parse `Global.datasmithenterprise` for `Container_Property` and `Loot_Table_Record` entries. If `sc-unpacked-data` already republishes these (agent should verify via a repo tree walk before committing to scraping), that's strictly preferable to SCMDB scraping — it's JSON, not HTML, and it tracks the patch directly.
3. **Manual curation** — last resort, `source='manual'`, a `data/loot_tables_manual.yaml` file Pedro edits by hand. Kept only for the few high-value drops (e.g. specific railgun blueprints) that SCMDB and sc-unpacked-data both miss.

**Difficulty, flagged honestly:** This is the single hardest gap to close. The difficulty is not the schema — it's that nobody has a *clean* public loot table source. SCMDB is the closest thing and it's HTML-scraped; the sc-unpacked-data pass would require verifying a claim Gemini makes about a file structure nobody has independently confirmed. **Verdict:** ship the empty tables + migration in v1 (so the schema slot exists and nothing breaks later) and mark the fetcher as **v2 scope IF SCMDB scraping proves feasible; otherwise v3**. If we land it, this is the *"truc gigantesque"* Gemini pitched — the cross-source query "which mission farms this blueprint with the best yield?" has no public answer today.

**Unique query unlocked:** *"Show me every way I can obtain `kastak_arms_devastator_shotgun`, sorted by expected value per mission-run (probability × qty × shop-price at the nearest resell terminal)."* — joins loot_table_entry → loot_table → missions, plus prices from `PriceSnapshot`. Directly answers Pedro's seed `sc-craft.tools`/SCMDB use case ("trouver sur quelles missions farmer les blueprints").

**Refresh class:** static — per game patch. SCMDB updates within a few days of each patch; we poll `version-watch` on a 30m cadence and trigger a `refresh-loot` only when the game version bumps.

### 1.d `item_signature_coefficients` — per-component emission multipliers

```sql
CREATE TABLE item_signature_coefficients (
  item_uuid  TEXT PRIMARY KEY,    -- FK to items.uuid
  c_ir       REAL,                -- infrared emission multiplier vs base energy draw (unitless)
  c_em       REAL,                -- electromagnetic emission multiplier
  c_cs       REAL,                -- cross-section (radar) coefficient
  notes      TEXT,                -- free-form, e.g. 'military-grade A generator — verified from erkul ship.xml dump'
  FOREIGN KEY (item_uuid) REFERENCES items(uuid)
);
```

**Why a side table instead of JSON on `items`.** These are queried *together* ("sum all `c_ir` × power draw for every equipped component to get ship-level IR"), but the query is cross-row by nature — you need indexable numeric columns to aggregate across a ship's loadout without deserializing JSON for every component. Side table wins on query shape even though the row count is small (~800 rows, one per component class that has signature data).

**Ship-level signature formula (computed at read time in Hono, not stored):**

```
ship.ir_signature = Σ (installed_component.power_draw_w × coef.c_ir)       for each component with entry in item_signature_coefficients
ship.em_signature = Σ (installed_component.power_draw_w × coef.c_em)
ship.cs_signature = base_ship_cross_section + Σ (hardpoint_surface × coef.c_cs)  -- cross-section is geometry + mounted-component projection
```

Why compute at read time (matches §4.5): the formula will change as CIG tunes signature mechanics, and we do NOT want to migrate every ship row when that happens. The `vehicles` table stores raw `ir_signature_base` / `em_signature_base` / `cs_signature_base` as fallbacks for when components are missing — but the "true" signature a Hono response returns is the component sum.

**Source revisited — do we need SPViewer?** Current SOURCES.md §11 marks SPViewer as "skipped". Reconsider: Gemini's dump and the Garden Discord dump both list SPViewer as the *sole* public source for signature curves. **Action for the sources-gap-fill agent:** before v1 ships, verify whether erkul's component dump includes `c_ir`/`c_em`/`c_cs` fields (a quick grep of `~/sc-data/erkul_all.json` for `Signature`/`IR`/`EM` will answer this) — if yes, erkul stays authoritative and SPViewer stays skipped. **If no, SPViewer is unskipped for this one column group specifically** and a `refresh-spviewer` job gets added in §5, narrowly scoped to signature coefficients. The rest of SPViewer (flight model curves) remains covered by erkul.

**Refresh class:** static — per game patch.

### 1.e `localization` — multi-language in-game strings

```sql
CREATE TABLE localization (
  key    TEXT NOT NULL,     -- CryEngine string key, e.g. '@item_power_plant_S1', '@veh_anvl_aurora_es_name'
  lang   TEXT NOT NULL,     -- 'en' | 'fr' | 'de' | 'es' | 'it' | 'ja'
  value  TEXT NOT NULL,     -- the translated display string
  PRIMARY KEY (key, lang)
);
CREATE INDEX idx_localization_key ON localization(key);
```

**Source:** `github.com/starcitizen-localization/*` — a set of repos publishing the in-game `.ini` translation files CIG ships per language. Git clone once, git pull weekly. Parse each `*.ini` file in each language folder into `(key, lang, value)` rows and batch-upsert. Total row count ≈ 60k strings × 6 languages = ~360k rows; all-text, ~20 MB in SQLite.

**Join pattern.** Every component, vehicle, location, and FPS item has a `local_name` (CryEngine class id, e.g. `aegs_avenger_stalker`, `vncl_lasercannon_s1`) that resolves to a display-name key (e.g. `@veh_aegs_avenger_stalker_name`) via a deterministic naming convention. The API adds a join on `items.class_name`-derived key → `localization.key` at the requested `lang`, and returns the localized name in the canonical row shape: `{ name: 'Laser Cannon S1', name_i18n: { en: 'Laser Cannon S1', fr: 'Canon Laser S1', … } }`. If a key is missing for the requested language, fall back to `en`, then to the raw `items.name`.

**Pedro's default.** Pedro is French-speaking (per `~/.claude/projects/-home-pedro/memory/user_pedro.md`). Default display language is `fr`, set in the web app's server component via a `lang` cookie and an `Accept-Language` sniff on first visit. English is the fallback when a French string is missing. The site still works exclusively in English for non-French visitors — the Accept-Language header handles that automatically.

**Why this is a huge win for almost no cost.** Once the clone is done, the entire DB becomes multi-language in a single join. No wiki per-language scrape, no manual translation table, no per-entity `name_fr` column. This also sidesteps the "Wiki has French lore but only for some vehicles" mess the old project had.

**Refresh class:** static — weekly git pull + full upsert. If the repo is unreachable, the last-known data stays in the table; the site keeps serving cached translations and logs a stale-localization warning.

## 2. Per-entity source priority

For every entity we define the source priority per field group. Read this as:
"for `Vehicle.specs.shield_hp`, try erkul first; if missing, try Wiki; if
missing, null." The priority list is walked left-to-right until a non-null
value is found.

Sources in scope (full catalog lives in `SOURCES.md`):

1. **UEX 2.0** (`api.uexcorp.space/2.0/`) — economy + canonical location/terminal spine. Rate limit 120/min, no auth for reads.
2. **SC Wiki v3** (`api.star-citizen.wiki/api/v3/`) — lore + dimensions + combat + SKU/MSRP + signature/agility breakdowns. ~250ms polite.
3. **RSI ship-matrix** (`robertsspaceindustries.com/ship-matrix/index?`) — only canonical image source that works in browsers, plus official RSI loadouts and store URLs. Server-side fetch only (Cloudflare UA rules).
4. **erkul.games** (`server.erkul.games/`) — default loadouts, parsed component stats, hull HP tree, IFCS flight model. Single biggest source for "how this ship actually plays". Local snapshot: `~/sc-data/erkul_all.json`.
5. **finder.cstone.space** — the polished "raw CryEngine attribute" mirror for components + FPS + **601 shop inventories (~24k items)**. Local snapshot: `~/sc-data/cstone_all.json`.
6. **sc-craft.tools** — crafting blueprints (recipes, ingredient slots, quality-curve modifiers). Local snapshot: `~/sc-data/blueprints.json`.
7. **wiki_mining.json** (local) — despite the name, a 215 MB dump of the wiki's `/api/v2/items` endpoint, ~59k items including FPS gear, paints, doors, displays. Bootstrap-only.
8. **scunpacked** (`github.com/StarCitizenWiki/scunpacked-data`) — git repo with datamined JSON dumps. Weekly `git pull` as enrichment + sanity check. Low priority for v1.
9. **unp4k / Data.p4k** — nuclear option for 3D models and ground-truth XML. Documented but NOT in the live pipeline (requires a SC install; Pi doesn't have one).
10. **starcitizen-api.com, spviewer.eu** — explicitly skipped (see SOURCES.md §10–11).

Join keys:
- **`slug`** joins UEX ↔ Wiki ↔ RSI ship-matrix (with the alias rewrite table from `~/sc-site-old/packages/sc-data/src/fetchers/wiki.ts`).
- **`localName`** (CryEngine class id, e.g. `aegs_avenger_stalker`, `vncl_lasercannon_s1`) joins erkul ↔ cstone ↔ scunpacked.
- **`uuid`** (RSI internal) joins Wiki ↔ UEX ↔ erkul (`erkul.data.ref`) — use as secondary key for items.

### Vehicle

```
Vehicle.id              ← UEX.id                                         (canonical integer key)
Vehicle.slug            ← UEX.slug  ← generated from UEX.name            (canonical string key, joined across sources)
Vehicle.name            ← UEX.name                                       (authoritative: UEX is the one that matches the in-game market/terminal listing)
Vehicle.name_full       ← UEX.name_full  ← Wiki.name                     (fallback)
Vehicle.manufacturer    ← UEX.company_name  ← Wiki.manufacturer  ← erkul.manufacturerData.name
Vehicle.slug_aliases    ← computed by refresh-wiki (the slug rewrite table from old code)
Vehicle.career          ← erkul.vehicle.career  ← Wiki.career            (erkul maps to in-game XML which is ground-truth for role)
Vehicle.role            ← erkul.vehicle.role    ← Wiki.role
Vehicle.size_class      ← Wiki.size_class       ← erkul.data.size        (S1–S10 classification; Wiki has the clearest labeling)
Vehicle.is_spaceship    ← UEX.is_spaceship                               (and the rest of UEX's ~35 `is_*` booleans)
Vehicle.loaners         ← UEX.ids_vehicles_loaners                       (only UEX publishes loaners)

Vehicle.dimensions_json {length, beam, height}
                        ← Wiki.sizes  ← erkul.vehicle.size  ← UEX.{length,width,height}
                        (Wiki has the cleanest dims; UEX values are ship.xml dims which include wings folded)

Vehicle.mass_json {hull, loadout, total}
                        ← Wiki.{mass_hull, mass_loadout, mass_total}  ← UEX.mass

Vehicle.cargo_json {scu, vehicle_inventory, container_sizes}
                        ← Wiki.{cargo_capacity, vehicle_inventory}  ← UEX.{scu, container_sizes}
                        (Wiki separates "cargo grid SCU" from "personal inventory"; UEX only has the grid total)

Vehicle.crew_json {min, max, weapon}
                        ← Wiki.crew  ← UEX.crew (CSV string, parsed)

Vehicle.combat_json {health_hp, shield_hp, shield_regen, shield_face_type, hull_hp_tree}
                        ← erkul.health.hp, erkul.shield, erkul.hull.hp  ← Wiki.health, Wiki.shield
                        (erkul exposes the per-region HP tree which nothing else has)

Vehicle.mobility_json {scm, max, boost, zero_to_scm, zero_to_max, ang_vel_x/y/z, afterburner}
                        ← erkul.ifcs  ← Wiki.speed
                        (erkul has angular velocity + full afterburner model; Wiki only has top-line numbers)

Vehicle.fuel_json {hydrogen_capacity, intake_rate, quantum_capacity}
                        ← erkul.fuelCapacity + erkul.qtFuelCapacity  ← Wiki.fuel  ← UEX.{fuel_hydrogen, fuel_quantum}

Vehicle.weapon_snapshot_json {pilot_guns, turrets_manned, turrets_remote, missile_racks, missiles, countermeasures}
                        ← Wiki.weapon_snapshot  ← derived from erkul.loadout  (count of filled ports by type)

Vehicle.loadout_json    ← erkul.loadout (full port tree with itemPortName, requiredTags, itemTypes[], default component ref)
                        ← UEX has no equivalent; null fallback
                        (erkul is unique here — single most valuable source for ships)

Vehicle.image_canon     ← local path "data/ships/{slug}.webp"
                        (downloaded ONCE from RSI ship-matrix `media[].derived_data.sizes.post-large.url` via refresh-images on new-ship detect; sharp-resized to 1920w+800w+400w)
                        ← Wiki media URL  ← null
                        (UEX `url_photo` is explicitly NOT used — assets.uexcorp.space 503s in browsers per SOURCES.md §1)

Vehicle.image_card      ← same origin, cropped 16:9, 800w

Vehicle.images_extras_json
                        ← UEX.{url_photo, url_photos, url_brochure, url_hotsite, url_video}  (just URLs, we don't host these)

Vehicle.urls_json {store, brochure, hotsite, video}
                        ← UEX.url_*  ← Wiki.web_url

Vehicle.lore            ← Wiki.description  ← erkul.data.description  ← null
                        (only narrative source; erkul has a shorter description from ship.xml as fallback)

Vehicle.production_status ← Wiki.production_status  ← UEX.is_concept (derived)

Vehicle.3d_model        ← LATER: unp4k extraction → GLB in data/models/{slug}.glb. Column is nullable and null for every ship on day 1.

Vehicle.data_freshness  ← computed: min(source timestamps) + flags for stale sources
```

### Item (ship components + FPS gear, unified)

```
Item.id              ← UEX.id
Item.slug            ← UEX.slug  ← generated
Item.uuid            ← UEX.uuid  ← erkul.data.ref    (RSI internal uuid)
Item.local_name      ← erkul.localName  ← cstone.ItemCodeName  ← scunpacked class id
                        (CryEngine class id — the cross-source join key for components)
Item.name            ← UEX.name
Item.kind            ← derived from UEX.category/section:
                         weapon-ship-gun | weapon-ship-turret | missile |
                         shield | quantum | cooler | power-plant |
                         mining-laser | mining-module | utility |
                         fps-weapon | fps-armor | fps-helmet | fps-undersuit | fps-medical |
                         food | drink | gadget | hacking-chip | attachment | magazine | container |
                         component-misc
Item.size            ← UEX.size  ← erkul component size  ← cstone.Size
Item.grade           ← UEX.quality  ← erkul.grade  ← cstone.Grade (A/B/C/D)
Item.manufacturer    ← UEX.company_name  ← Wiki.manufacturer  ← cstone.Manu
Item.image           ← UEX.screenshot  ← Wiki media  ← null

Item.stats_json {type-specific stat blob}
                     ← erkul.weapons[] / erkul.shields[] / erkul.qdrives[] / …  (erkul publishes richly-typed stats per item kind, most polished)
                     ← cstone.<category endpoint>  (raw CryEngine attributes — `Powerdraw`, `LaserInstability`, `OptimalChargeWindowSizeModifier` — keep these verbatim in `stats.raw` for engineering tooltips)
                     ← Wiki component detail endpoint where available
                     ← UEX.items_attributes (flattened into keyed object)
                     ← wiki_mining.json row (local fallback for FPS gear)

Item.description     ← UEX.description  ← Wiki.description  ← erkul.description  ← cstone.Desc

Item.url_store       ← UEX.url_store

Item.is_pledge_exclusive ← UEX.is_exclusive_pledge
Item.is_sub_exclusive    ← UEX.is_exclusive_subscriber
Item.is_concierge_exclusive ← UEX.is_exclusive_concierge
```

Note: the old design had `items_attributes` as a side table. We keep it as
`ItemAttribute` because it's truly N:M (one item has N attributes, each
attribute can appear on many items as a category header). It's also
independently searchable ("all items where `recoil` < 5").

**Join strategy for items across sources:**

1. First try match by `uuid` (UEX ↔ erkul ↔ Wiki all use the same RSI uuid when present).
2. Then by `local_name` (erkul ↔ cstone ↔ scunpacked — case-insensitive).
3. Fall back to normalized name match (lowercased, alphanumeric-only, with
   a hand-curated alias table if needed — same pattern as `expandUexCandidates`
   from the old wiki fetcher).

### Commodity

```
Commodity.id         ← UEX.id
Commodity.slug       ← UEX.slug  ← generated from UEX.name
Commodity.name       ← UEX.name
Commodity.code       ← UEX.code
Commodity.kind       ← UEX.kind
Commodity.weight_scu ← UEX.weight_scu
Commodity.flags_json {is_mineral, is_raw, is_refined, is_harvestable, is_illegal, is_fuel, is_volatile_qt, is_volatile_time, is_inert, is_explosive, is_buggy, is_extractable, is_pure, is_refinable, is_temporary}
                     ← UEX flags (collapsed from 20 notnull int columns to a single JSON blob)
Commodity.wiki_url   ← UEX.wiki
Commodity.lore       ← Wiki.description  ← null
Commodity.image      ← Wiki image  ← null
```

UEX is essentially the only source for the economy side. Wiki is used for lore
and an optional image; if Wiki is down, we just show the commodity without a
description.

### Location (unified tree)

```
Location.id          ← UEX.id (namespaced by kind internally — see §6)
Location.kind        ← 'system' | 'planet' | 'moon' | 'city' | 'station' | 'outpost' | 'poi' | 'jump_point'
Location.slug        ← generated from (kind, name)  stable across refreshes
Location.parent_id   ← local FK to Location.id (null for systems)
Location.name        ← UEX.name
Location.code        ← UEX.code
Location.faction     ← UEX.faction_name
Location.jurisdiction ← UEX.jurisdiction_name
Location.flags_json {is_available, is_available_live, is_visible, is_monitored, is_armistice, is_landable, is_decommissioned, has_*}
                     ← UEX flags (merged across all location endpoint variants)
Location.pad_types   ← UEX.pad_types
Location.wiki_url    ← UEX.wiki
Location.lore        ← Wiki.description  ← null
Location.image       ← Wiki image  ← RSI galactapedia image  ← null
Location.coords_json ← LATER: CCU tools / datamine    (null at launch)

Location.atmosphere_json              (ONLY for kind='planet' or kind='moon')
                     ← scunpacked Environment/Atmosphere/<planet>.xml → parsed curve
                     ← null
                     // Shape: { altitude_m_to_density_kgm3: [[0, 1.225], [1000, 1.11], [5000, 0.74], [10000, 0.41], ...] }
                     // Piecewise-linear density curve. Used by the "ground-to-orbit time" calculator
                     // on the location detail page and by the signature API (dense atmosphere dampens IR).
```

Unifying planets/moons/cities/stations/outposts into a single `Location` table
kills the "which table do I join?" ceremony. `kind` separates them, and
`parent_id` gives the tree. For star systems, `parent_id` is null.

**On `atmosphere_json` (Gap 9 — v2 scope).** The density curve lives in a
JSON column on `locations` rather than a side table. Trade-off: a side table
`atmosphere_layer (location_id, altitude_m, density_kgm3)` would let SQL
`WHERE altitude_m < X` filters work, but the only query we ever run is "give
me the whole curve to integrate" — the same integration Hono does for the
ground-to-orbit time. JSON wins on read simplicity at the cost of a few
wasted bytes (~200 per planet × ~30 planets ≈ 6 KB total, negligible). The
`atmosphere_json` column is NULL for every `kind` except `planet` and `moon`.
Use case: ground-to-orbit time calculator on the location detail page, plus
a signature modifier in the combat analysis view (dense atmosphere dampens
IR signature — matters for stealth-oriented pilots). **Scope: v2** — it's
niche, and source extraction requires either `scunpacked` to expose the
`Environment/Atmosphere` folder or a `unp4k` one-shot pass. Schema slot
ships in v1 so no migration is needed later.

### Terminal

```
Terminal.id          ← UEX.id
Terminal.slug        ← generated from (location, name)
Terminal.location_id ← local FK to Location (the most specific wrapping location UEX tells us about)
Terminal.name        ← UEX.name
Terminal.code        ← UEX.code
Terminal.type        ← UEX.type
Terminal.flags_json {is_available, is_available_live, is_habitation, is_refinery, is_cargo_center, is_medical, is_food, is_shop_fps, is_shop_vehicle, is_refuel, is_repair, is_nqa, is_jump_point, is_player_owned, has_loading_dock, has_docking_port, has_freight_elevator}
                     ← UEX.is_* / has_*
Terminal.max_container_size ← UEX.max_container_size
Terminal.mcs         ← UEX.mcs
Terminal.screenshot  ← UEX.screenshot  (hosted by UEX, we link)
Terminal.screenshot_author ← UEX.screenshot_author
```

### JumpPoint

```
JumpPoint.id                  ← UEX.id
JumpPoint.origin_system_id    ← UEX.id_star_system_origin
JumpPoint.destination_system_id ← UEX.id_star_system_destination
JumpPoint.origin_label        ← UEX.orbit_origin_name
JumpPoint.destination_label   ← UEX.orbit_destination_name
```

Very small table. Kept separate because it's an edge, not a node — graph
queries read it as a relation.

### Shop (vehicle/item shops as presented in the UI)

```
Shop.id              ← synthetic
Shop.terminal_id     ← local FK (may be null if sourced from cstone without a UEX terminal match)
Shop.location_label  ← cstone shop path (e.g. "Nyx - Levski - Refinery 03 - Supplies") — preserved verbatim for display
Shop.subject_kind    ← 'item' | 'vehicle' (what the shop sells)
Shop.subject_id      ← local FK to Item or Vehicle
Shop.price_buy       ← latest PriceSnapshot (commodity) OR UEX items_prices (for items we can match)
                     ← cstone shop row `price` (for FPS-gear shops UEX doesn't cover — SOURCES.md notes 601 shops × ~40 items = ~24k rows that ONLY cstone has)
Shop.source          ← 'uex' | 'cstone' (so the UI can badge them, e.g. "from UEX" vs "from Citizen Stone")
Shop.stock_status    ← UEX status_buy (if available) ← null
```

The old schema didn't have a `Shop` entity — the UI joined items and prices
ad-hoc. Here it's a first-class thing because Pedro wants a "where do I buy
X?" page. Shops are written by the price fetcher AND the cstone fetcher.
They're denormalized — rebuildable from raw prices if we ever need to.

**Priority:** UEX `items_prices` is preferred where it covers an item
(because it's live-updated on a 15m cycle). cstone fills the long tail of
smaller shops UEX doesn't track — this is the ONLY source for ~80% of FPS
gear shop data per SOURCES.md §5.

### Blueprint (v1 — crafting system)

**Promoted from v2 to v1** because Pedro's seed-sources.md explicitly calls out:

> "SCMDB — Indispensable depuis l'alpha 4.7 et l'arrivée du Crafting. Base de
> données ultime pour trouver sur quelles missions farmer les 'Blueprints'
> (plans de fabrication), où trouver les composants de craft. NEW & CURRENT"

Alpha 4.7 made crafting a core gameplay loop. Shipping sc-site v1 without a
crafting DB would be missing the current meta.

```
Blueprint.id                    ← sc-craft.tools.id                (canonical int PK)
Blueprint.blueprint_id          ← sc-craft.tools.blueprint_id      (in-game GUID, the CryEngine-level id)
Blueprint.slug                  ← generated from name              (canonical string key)
Blueprint.name                  ← sc-craft.tools.name  ← localization[@bp_<id>_name]
Blueprint.category              ← sc-craft.tools.category          ("Weapons / Sniper", "Ships / Light Fighter", …)
Blueprint.output_item_uuid      ← sc-craft.tools.item_uuid         (what it crafts — FK to items.uuid)
Blueprint.output_qty            ← sc-craft.tools.output_qty        (how many units per craft; default 1)
Blueprint.craft_time_seconds    ← sc-craft.tools.craft_time_seconds
Blueprint.skill_required        ← sc-craft.tools.profession_required  (profession/level gating, e.g. "Weaponsmith II")
Blueprint.tier                  ← sc-craft.tools.tier              (1..5 quality tier of the blueprint itself)
Blueprint.tiers_json            ← sc-craft.tools.tiers             (per-tier stat multipliers, quality curves)
Blueprint.source_mission_ids    ← SCMDB: which missions drop this BP (JSON array of mission UUIDs)
                                ← sc-craft.tools.source_missions (if present)
                                ← null
Blueprint.ingredients_json      ← sc-craft.tools.ingredients       (deeply-nested: slot → options[] → quality_effects[])
                                ← scunpacked recipe files          (fallback: parsed from crafting/*.xml)
Blueprint.item_stats_json       ← sc-craft.tools.item_stats        (preview of what the crafted item will look like)
Blueprint.version               ← sc-craft.tools.version           (e.g. "LIVE-4.7.0-11518367")
Blueprint.lore                  ← Wiki blueprint page, if any
```

**Canonical SQL**:

```sql
CREATE TABLE blueprints (
  id                  INTEGER PRIMARY KEY,
  blueprint_id        TEXT UNIQUE NOT NULL,              -- in-game GUID
  slug                TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  category            TEXT,
  output_item_uuid    TEXT NOT NULL,                     -- what it crafts
  output_qty          INTEGER NOT NULL DEFAULT 1,
  skill_required      TEXT,                              -- profession/level gating
  tier                INTEGER,                           -- 1..5 quality tier of the BP itself
  craft_time_seconds  INTEGER,
  source_mission_ids  TEXT,                              -- JSON array of mission UUIDs that drop this BP
  ingredients_json    TEXT NOT NULL,                     -- JSON: [{slot, item_uuid, qty, quality_curve}, …]
  tiers_json          TEXT,                              -- JSON: per-tier stat multipliers
  item_stats_json     TEXT,                              -- JSON: preview of crafted output stats
  lore                TEXT,
  version             TEXT,                              -- e.g. 'LIVE-4.7.0-11518367'
  data_sources        TEXT NOT NULL,                     -- JSON: {sc-craft: ts, scmdb: ts, wiki: ts}
  updated_at          INTEGER NOT NULL,
  FOREIGN KEY (output_item_uuid) REFERENCES items(uuid)
);
CREATE INDEX idx_blueprints_output ON blueprints(output_item_uuid);
CREATE INDEX idx_blueprints_category ON blueprints(category);
```

**Ingredient slot shape** (explicit, because it's complex):

```ts
// ingredients_json row shape (array of slots)
type BlueprintIngredientSlot = {
  slot_id: string                            // e.g. 'frame', 'powercore', 'coolant'
  slot_label: string                         // human-readable
  required: boolean                          // some slots are optional (quality boosters)
  options: Array<{
    item_uuid: string                        // the ingredient item
    qty_min: number
    qty_max: number
    quality_curve: Array<{                   // how ingredient quality affects output quality
      input_quality: number                  // 0..100
      output_contribution: number            // 0..1 (how much this input moves the output tier)
    }>
    substitutable_with?: string[]            // other item_uuids that can fill this slot at a quality penalty
  }>
}
```

Kept as a JSON column (not a side table) because the recipe tree is always
read as a unit when rendering a blueprint page. No side table for ingredients
because we never independently query "all ingredients of quality > X"; we load
the blueprint and render it. **The one exception** is the "what can I craft
with this item?" reverse query on the Item detail page, which we answer by a
`LIKE` scan on `ingredients_json` joined with a redundant
`item_crafts_into` materialized index table — cheap to rebuild at the end of
each `refresh-blueprints` run.

```sql
CREATE TABLE item_crafts_into (
  item_uuid     TEXT NOT NULL,        -- the ingredient item
  blueprint_id  INTEGER NOT NULL,     -- FK to blueprints.id
  PRIMARY KEY (item_uuid, blueprint_id),
  FOREIGN KEY (item_uuid)    REFERENCES items(uuid),
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(id) ON DELETE CASCADE
);
```

**Source walk:** sc-craft.tools first (Pedro already has a local snapshot in
`~/sc-data/blueprints.json` — 1040 blueprints, see §10). SCMDB second,
specifically for the `source_mission_ids` column (sc-craft.tools doesn't have
clean mission-drop data). scunpacked third as a sanity check on ingredient
slots. Wiki last, only for lore.

**Refresh class:** static (weekly on Sunday + on-patch via version-watch).

## 3. Conflict resolution

When two sources disagree on a field (a real case: UEX says `shield_hp=15000`
for the Avenger Stalker, Wiki says `shield_hp=14500`, erkul says `17500` with
default shield), we resolve with a three-layer process.

### Layer 1 — per-field source priority (default)

The priority list in §2 is walked left-to-right, stopping on the first
non-null value. This handles 99% of conflicts: we just *choose* a source per
field rather than comparing.

### Layer 2 — manual override table `SourceOverride`

```
SourceOverride {
  entity_kind  text     // 'vehicle' | 'item' | 'commodity' | 'location' | 'terminal'
  entity_slug  text     // canonical slug of the target row
  field_path   text     // dotted path into the canonical shape, e.g. "combat.shield_hp"
  value_json   text     // the override value, JSON-encoded
  reason       text     // free-form human note
  updated_at   integer
  primary key (entity_kind, entity_slug, field_path)
}
```

Applied by the aggregator *after* the source-priority merge, before writing to
the canonical row. Pedro owns this table; the aggregator reads it but never
writes to it. This is the escape hatch for data that's just plain wrong at
every upstream source (happens with concept ships and with Wiki cache lag).

### Layer 3 — freshness tie-breaker

Used only when two equally-prioritized sources *both* have a non-null value
AND disagree. Example: if the priority says `← erkul ← Wiki` but erkul is
deliberately skipped this run (source-specific failure), Wiki's value is
consumed without complaint. But if both succeed and the priority is a tie
(this happens at the leaf level in a few places, like `Location.lore`), we
pick the source whose `fetched_at` in `CacheHttp` is more recent.

The default rule when nothing is specified: **earlier entry in the priority
list wins.** "Most recent" is only a fallback, never the default — otherwise
refresh jitter could flip values between runs and the UI would blink.

## 4. Two-tier caching strategy

### Tier 1 — canonical SQLite (the source of truth)

SQLite file at `data/sc.db`, managed by Drizzle. This is what `apps/api` reads
on every request. The web app **never** hits external APIs at request time.

Write path: cron jobs → fetchers → aggregator → Drizzle upsert → row in the
relevant table.

Read path: Hono handlers → Drizzle select → RPC client type flows to Next.js.

Migration path: `drizzle-kit` migrations live in `packages/db/drizzle/`, run at
boot via a small `migrate()` helper. Never `drizzle-kit push` against the prod
DB — always generate a migration and apply it.

### Tier 2 — HTTP response cache (side store)

Located in the `cache_http` table (NOT on disk — one table, one SQL query, one
ACID guarantee, no stat-ing a directory). Schema:

```
cache_http {
  id          integer primary key autoincrement
  source      text not null    // 'uex' | 'wiki' | 'erkul' | 'rsi' | 'unp4k' | …
  url         text not null    // fully qualified URL with all params
  method      text default 'GET'
  body_hash   text             // for POST bodies; null for GET
  status      integer not null // HTTP status code
  headers_json text            // compact JSON of relevant response headers
  body_text   text             // response body (string-ified JSON or raw text)
  etag        text             // from response headers
  last_modified text           // from response headers
  fetched_at  integer not null // ms since epoch
  ttl_ms      integer not null // how long this entry is considered fresh
  byte_size   integer
  unique (source, url, body_hash)
}
```

Rules:

- **Before any fetch:** check `cache_http` for `(source, url, body_hash)` with
  `fetched_at + ttl_ms > now`. If fresh → use cached body, skip network. If
  stale but has `etag`/`last_modified` → send conditional request (`If-None-Match`
  / `If-Modified-Since`); on `304 Not Modified`, refresh `fetched_at` and keep
  cached body. If miss → fetch, store.
- **Per-source TTL:**
  - UEX static: 24h
  - UEX prices: 10m
  - Wiki pages: 7d
  - erkul scrape: 7d
  - RSI ship-matrix: 3d
- **Failure is cache-friendly:** on 5xx or timeout, the cached body is served
  to the fetcher (stale-ok read) AND the entity is flagged
  `data_freshness_warning=true` in Tier 1.
- **Max age:** rows older than 30 days are reaped by a nightly sweep.
- **Size cap:** a single row body_text larger than 20 MB skips cache and is
  streamed to disk in `data/cache_large/` instead (erkul_all.json is ~20 MB,
  it goes here).

Why a table, not files?
- Atomic writes (one transaction for a whole refresh is possible)
- Easy to query "which sources failed in the last hour"
- Backup = copy the one DB file
- Cleanup = one `DELETE` statement

Why not Redis? Overkill on a Pi. The DB is already open, it's fast for ~10k
rows of text blobs, and we avoid running another daemon.

## 4.5 Pipeline layers and derived fields

Gemini's architectural frame for the ingestion code is a 4-layer pipeline
(gemini-architecture.md §Part 3). The refresh jobs in §5 all fit inside this
frame — it's a shared vocabulary, not a second runtime:

1. **Fetcher** — polls or watches an external source, returns raw bytes or
   parsed JSON. Per-source rate limiting, per-source TTL cache check against
   `cache_http` (§4). Examples: `fetch-uex-vehicles`, `fetch-erkul-ships`,
   `fetch-scunpacked-commit`, `fetch-ship-ctm`, `fetch-localization-repo`.
2. **Unpacker** — converts raw bytes to typed JSON. Usually a no-op because
   upstream sources already publish JSON, but it owns the `.ini → rows` parser
   for the localization pipeline (§4.6) and the `.ctm` header sanity check
   for the ship-model pipeline (§4.7). Kept as a distinct layer so future
   direct `unp4k` integration has a home.
3. **Transformer** — the brain. Joins data across sources by UUID/slug/class-
   name, applies the source-priority walk from §2, applies the SourceOverride
   table (§3), produces a canonical entity ready for upsert. Also emits
   `change_log` rows (§1.a) by diffing against the existing DB row.
4. **Loader** — batched `ON CONFLICT DO UPDATE` upserts via `bun:sqlite`
   transactions. One transaction per entity type per refresh job. On failure
   the whole transaction rolls back — partial writes are not a state we allow
   in the canonical DB.

### 4.5.1 Derived fields — IFCS acceleration as a function of cargo fill

Gemini's flight-model note (gemini-architecture.md §5):

> "Formula: Acceleration = Thrust / (Mass + Cargo). The DB must be able to
> compute maneuverability as a function of SCU fill — almost no site does
> this."

**Where the computation lives: Hono API compute-on-fetch.** Three candidates
were considered:

| Option                  | Pros                                                  | Cons                                                                                 |
|-------------------------|-------------------------------------------------------|--------------------------------------------------------------------------------------|
| DB generated column     | Zero runtime cost, indexable                          | Formula changes need a migration; generated columns don't accept a dynamic parameter (`cargo_scu`) |
| Hono API compute-on-fetch | Formula lives in plain TypeScript, easy to change; frontend gets a plain number | One JS multiply per request (trivial)                                                |
| Frontend compute        | DB and API stay pure                                  | Duplicates the formula across consumers (API clients, RPC, SSR pages)                |

**Winner: Hono API compute-on-fetch.** The formula will change as CIG tunes
IFCS (it already has, several times since 3.x). Migration on every tuning
pass is unacceptable. Putting it in the API means one place to update, one
deploy, every client picks up the new formula on next request. The per-request
cost is a single floating-point multiply per thrust axis — negligible.

**Raw columns the DB must store for the formula to work.** Add to the
`vehicles` table as real columns (not JSON), because they're numeric and
you want to sort/filter on them individually from the catalog UI:

```
vehicles.mass_empty_kg       REAL      -- hull-only mass, no loadout, no cargo
vehicles.mass_loadout_kg     REAL      -- default-loadout mass (the number erkul stores)
vehicles.thrust_main_n       REAL      -- sum of main thrusters in newtons
vehicles.thrust_retro_n      REAL      -- sum of retro thrusters
vehicles.thrust_lateral_n    REAL      -- sum of lateral (strafe) thrusters
vehicles.thrust_vertical_n   REAL      -- sum of vertical (VTOL) thrusters
vehicles.torque_x_nm         REAL      -- pitch axis torque
vehicles.torque_y_nm         REAL      -- yaw axis torque
vehicles.torque_z_nm         REAL      -- roll axis torque
vehicles.cargo_max_scu       INTEGER   -- already stored in cargo_json.scu; hoist to a real column
```

Source: erkul `ifcs` block (main source), Wiki `mobility.thrust` (fallback),
scunpacked `ship.xml` IFCS dump (ground truth for the axes erkul doesn't
break out). These are **hoisted out of `mobility_json`** because the IFCS
endpoint needs them individually and the catalog filter UI benefits from
real indexable numeric columns.

**API signature:**

```
GET /vehicles/:slug/ifcs?cargo_scu=120

→ {
  cargo_scu: 120,
  cargo_mass_kg: 144000,                          // cargo_scu * 1200 kg/SCU (SC's canonical SCU mass)
  total_mass_kg: 468200,                          // mass_empty + mass_loadout + cargo_mass
  accel_main_ms2: 12.4,                           // thrust_main_n / total_mass_kg
  accel_retro_ms2: 9.1,                           // thrust_retro_n / total_mass_kg
  accel_lateral_ms2: 6.7,                         // thrust_lateral_n / total_mass_kg
  accel_vertical_ms2: 8.2,                        // thrust_vertical_n / total_mass_kg
  angular_accel_pitch_rads2: 0.45,                // torque_x_nm / moment_of_inertia (approximated)
  angular_accel_yaw_rads2: 0.42,
  angular_accel_roll_rads2: 0.78,
  time_to_top_speed_s: 8.1,                       // integration of accel profile to scm target
  scm_ms: 220,                                    // for reference; just echoed from vehicles.scm
  freshness: { source: 'erkul', fetched_at: 1712512800000 }
}
```

The Hono handler is ~30 lines. The frontend's cargo-fill slider emits
`cargo_scu` changes, the API recomputes the numbers instantly, Chart.js / the
3D view animates the new maneuverability envelope. **No other SC tool
exposes this** — Erkul computes for a fixed cargo-empty case, SPViewer
publishes curves but not against a dynamic cargo parameter.

### 4.5.2 Derived fields — component-level signatures

The signature computation from §1.d lives on the same compute-on-fetch path
for the same reason (CIG keeps tuning it). Exposed as:

```
GET /vehicles/:slug/signature?loadout_override=<base64_loadout_json>
→ { ir, em, cs, breakdown: [{ component, contribution_ir, contribution_em, contribution_cs }] }
```

`loadout_override` is optional — if absent, the ship's default loadout from
`Vehicle.loadout_json` is used. When present, the frontend's virtual
loadout builder can ask "if I swap this power plant for a military-grade A,
what does my IR look like?" without round-tripping through a save.

## 4.6 Localization pipeline

**Fetcher.** Git-clone the `github.com/starcitizen-localization/*` org (one
clone per language repo, typically 6 — `sc-ln-en`, `sc-ln-fr`, `sc-ln-de`,
`sc-ln-es`, `sc-ln-it`, `sc-ln-ja`). On subsequent runs `git pull --ff-only`
each repo. If a repo fails to pull, skip it and log — other languages can
still update.

**Unpacker.** Parse each `.ini` file line-by-line. The CIG format is
`@key=value` with UTF-8 escapes; values can span multiple lines terminated
by a bare newline (their format's own quirk). Reject lines that don't match
`/^@[a-z0-9_]+=/i` — those are comments or section headers. Emit
`(key, lang, value)` tuples.

**Transformer.** Normalize keys to lowercase (`@Item_Power_Plant_S1` →
`@item_power_plant_s1`). Apply a small alias map for keys that renamed
between patches (CIG does this occasionally — e.g. `@ship_` → `@veh_`).

**Loader.** Single transaction per language repo. `DELETE FROM localization
WHERE lang = ?` then bulk-insert the new rows — full replacement is cheaper
than a diff upsert when the row count per repo is ~60k and the upstream file
is rewritten on every patch anyway. After insert, a `change_log` row is NOT
emitted (localization churn would swamp the table); localization staleness
is tracked in `refresh_log` only.

**Default display language.** Pedro is French-speaking — `fr` is the default.
Language selection flow:

1. Next.js middleware reads `cookie.lang`. If present, use it.
2. Else read `Accept-Language` header, pick the first supported one
   (`fr|en|de|es|it|ja`). Default to `fr` if none match (Pedro is the primary
   user and `fr` is his preference).
3. API endpoints accept `?lang=xx` to override explicitly.
4. Fallback chain: requested lang → `en` → raw `items.name` from UEX/erkul.

## 4.7 Ship 3D model pipeline (`.ctm` bulk download)

**Background.** MOCKUP.md references a "Pedro manually scp's `.glb` files"
path as the 3D model source. Gemini offers a better-automated path: RSI's
own CDN serves `.ctm` (compressed geometry) files for every ship at a
predictable URL. Documented in gemini-architecture.md §7:

> "Starship42 JSON export — maps ship IDs to `.ctm` models. `.ctm` format
> — compressed geometry hosted at `https://robertsspaceindustries.com/
> media/[SHIP_ID]/source/ship.ctm`. Can be loaded by a three.js CTM loader."

**Fetcher — ShipModelFetcher.**

```
ShipModelFetcher:
  1. slugs = SELECT slug, rsi_id FROM vehicles WHERE rsi_id IS NOT NULL
     AND (model_ctm IS NULL OR model_ctm_checked_at < now - 7d)
  2. for each (slug, rsi_id) in slugs:
       url = `https://robertsspaceindustries.com/media/${rsi_id}/source/ship.ctm`
       resp = HEAD url  (rate-limit to 2 req/sec to be a good citizen)
       if resp.status == 200:
         body = GET url
         validate: first 4 bytes must be OCTM magic header ('OCTM')
         write to `apps/web/public/ships/${slug}.ctm`
         UPDATE vehicles SET model_ctm = `/ships/${slug}.ctm`,
                              model_ctm_bytes = length,
                              model_ctm_checked_at = now
           WHERE slug = ${slug}
       elif resp.status == 404:
         UPDATE vehicles SET model_ctm = NULL, model_ctm_checked_at = now
         log to refresh_log { job: 'ship-ctm', slug, status: '404' }
       else:
         log and retry on next run
  3. refresh_log.insert(job='ship-ctm-fetcher', …)
```

**Frontend consumption.** Three.js `CTMLoader` lazy-loads `/ships/:slug.ctm`
on ship focus (not on catalog page mount). The `vehicles.model_ctm` column is
read on the detail page to gate a `<ShipModel3D src={model_ctm} />` component
vs a fallback procedural placeholder mesh.

**Caveat — unverified CDN coverage.** We have **not** confirmed that every
ship in the ship-matrix has a `.ctm` at this URL. The peer `sources-gap-fill`
agent is verifying coverage against the full ~310-ship list. Three outcomes
are possible:

1. **Full coverage** (> 95% of ships): ship with the CTM pipeline as-is,
   skip the procedural fallback entirely.
2. **Partial coverage** (50–95%): ship both pipelines. `model_ctm` is
   populated where the fetcher finds a `.ctm`; for the rest, render the
   MOCKUP.md-defined procedural placeholder mesh sized to the real
   `dimensions_json` values. The viewer component checks `if model_ctm then
   <CTMShip/> else <PlaceholderShip/>`.
3. **Sparse coverage** (< 50%): abandon the CTM pipeline, fall back to the
   manual-scp `.glb` path from MOCKUP.md for a hand-picked set of hero ships.

**Both paths are documented** so whichever the verification produces, we
don't have to redesign. The pipeline step ships regardless — even under
outcome (3) it's cheap insurance to have the fetcher polling in case RSI
starts publishing more `.ctm`s later.

**New vehicle columns** added by this pipeline:

```
vehicles.rsi_id              INTEGER   -- RSI ship-matrix id, needed to build the CDN URL
vehicles.model_ctm           TEXT      -- local path, e.g. '/ships/avenger-stalker.ctm', or null
vehicles.model_ctm_bytes     INTEGER   -- file size for cache-bust / preload hints
vehicles.model_ctm_checked_at INTEGER  -- last HEAD/GET attempt (ms since epoch)
vehicles.model_glb           TEXT      -- existing column, still used for the manual-scp fallback
```

**Refresh class:** static — on-patch via version-watch. A weekly sweep also
re-checks 404s in case CIG starts publishing a previously-missing ship.

## 5. Refresh cadence per job

Cron runs via `croner` in `apps/api/src/cron/scheduler.ts` (pattern from
`sc-site-old` works; keep it). One `Cron` instance per tier, each with
`protect: true` so overlapping runs are skipped.

| Job                 | Sources hit                                                    | Frequency         | Why                                      |
|---------------------|----------------------------------------------------------------|-------------------|------------------------------------------|
| `refresh-static`    | UEX vehicles, commodities, items (via ~64 category iterations), refineries_methods, refineries_yields | daily `0 4 * * *` | Game patches change these; daily is enough |
| `refresh-locations` | UEX star_systems, planets, moons, cities, space_stations, outposts, jump_points, terminals | daily `30 4 * * *` | Follows static; patches rarely add locations |
| `refresh-wiki`      | api.star-citizen.wiki v3 /vehicles list + per-slug detail pass for `weapon_snapshot` and concept ships (per old `wiki-detail.ts`) | weekly `0 3 * * 0` | Lore/combat stats change only on patch   |
| `refresh-erkul`     | `server.erkul.games/live/ships` + `/live/{weapons,shields,coolers,power-plants,qdrives,mining-lasers,modules,missiles,utilities}` — or local `erkul_all.json` if upstream unreachable | weekly `30 3 * * 0` | Loadout defaults change on patch; 16.5 MB /live/ships, cache aggressively |
| `refresh-cstone`    | `finder.cstone.space` component endpoints (`/GetSWeapons`, `/GetShields`, `/GetPowers`, …) + per-shop `/GetLocation/<path>` for the 601 shop paths | weekly `0 4 * * 0` | Component + shop inventories; 200ms polite interval; not load-bearing for v1 launch |
| `refresh-blueprints`| `sc-craft.tools/api/blueprints?page=N` (21 pages × 50 rows) + `sc-craft.tools/api/config` to pin version, + SCMDB mission-drop scrape (for `source_mission_ids`) | weekly `30 4 * * 0` | Crafting is v1 scope — patch 4.7 made it core gameplay |
| `refresh-scunpacked`| `git pull` `StarCitizenWiki/scunpacked-data` → parse `Vehicles/Damage/*.json` for `component_damage_map` population + sanity cross-check against UEX/erkul | weekly `0 5 * * 0` + on version-watch | Component damage curves + scunpacked sanity pass in one job |
| `refresh-localization` | `git pull` each `starcitizen-localization/*` repo, parse `.ini` files, full-replace `localization` rows per language | weekly `30 5 * * 0` | Per-patch updates; cheap (git-diff → ~60k rows parsed in <5s) |
| `refresh-ship-ctm`  | HEAD + GET `robertsspaceindustries.com/media/<rsi_id>/source/ship.ctm` for each ship with `rsi_id IS NOT NULL`, 2 req/sec polite | on-patch via version-watch + weekly `0 6 * * 0` | Three.js model source; most ships change `.ctm` only on patch |
| `refresh-loot`      | SCMDB mission pages + `sc-unpacked-data` container records → populate `loot_table` + `loot_table_entry`. **v2 scope**, job stub ships in v1 as a no-op pending SCMDB scraping feasibility | weekly `30 6 * * 0` | Loot tables change rarely; job runs on patch bump |
| `refresh-signatures`| (conditional) `spviewer.eu` signature endpoint scrape, ONLY if erkul doesn't expose `c_ir`/`c_em`/`c_cs` — verified by sources-gap-fill before v1 | weekly `0 7 * * 0` | Per-component signature coefficients for §1.d |
| `refresh-images`    | RSI ship-matrix (only for vehicles without a local image file) | hourly (on-detect, `15 * * * *`) | Only runs work when it detects a new ship or a missing image |
| `refresh-prices`    | UEX commodities_prices (per terminal), vehicles_purchases_prices, vehicles_rentals_prices, fuel_prices | `*/15 * * * *`    | Volatile economy, 15min is the right trade-off |
| `refresh-routes`    | UEX commodities_routes (computed from fresh prices)            | `*/30 * * * *`    | Derived from prices, must lag them slightly to see fresh data |
| `uex-snapshot`      | Dumps the fresh UEX prices payload to `data/uex-snapshots/YYYY-MM-DD.json` (per SOURCES.md risk register point #1) | daily `0 1 * * *` | Disaster recovery — if UEX dies tomorrow we have last known prices on disk |
| `cache-sweep`       | —                                                              | daily `0 5 * * *` | Reap cache_http rows > 30 days           |
| `version-watch`     | Polls `server.erkul.games/informations` (cheap) — if `liveVersion` bumped since last run, triggers an immediate `refresh-static`+`refresh-wiki`+`refresh-erkul`+`refresh-scunpacked`+`refresh-ship-ctm`+`refresh-localization`+`refresh-blueprints` (per SOURCES.md risk point #5) | `*/30 * * * *`    | Automatic patch-day pickup |

Runtime budget (Pi 4, 120 req/min UEX limit):
- `refresh-static`: ~70 UEX calls (items by category) → ~45s
- `refresh-locations`: ~15 UEX calls → ~10s
- `refresh-prices`: ~700 terminal calls for commodity prices → ~6m at 120/min
  — acceptable on a 15m cadence, but we parallelize the non-UEX parts and
  prioritize commodity prices > vehicle prices > fuel prices
- `refresh-wiki`: ~7 pages of 50 vehicles = ~7 calls → ~2s
- `refresh-erkul`: 1 JSON download if upstream changed → ~10s

If the Pi ever chokes, the 15m prices cadence is what gets relaxed first (30m
is fine for Pedro).

## 6. Canonical entity shapes (TypeScript)

These are the *aggregated* shapes the API returns. Drizzle `$inferSelect`
types live next to them; the RPC client lifts them through Hono's type
inference so the web app sees the exact same shapes without duplication.

```ts
// packages/db/src/schema/vehicle.ts
// Persisted row. JSON columns are stored as text(mode: 'json').

interface VehicleRow {
  id: number                        // UEX.id (not null by design)
  slug: string                      // UEX.slug, or generated from name (not null by design)
  uuid: string | null               // UEX.uuid → RSI internal id, nullable
  name: string                      // UEX.name (not null by design)
  name_full: string | null          // UEX.name_full ← Wiki.name
  manufacturer: string | null       // UEX.company_name ← Wiki.manufacturer ← erkul.manufacturerData.name
  career: string | null             // erkul.vehicle.career ← Wiki.career
  role: string | null               // erkul.vehicle.role ← Wiki.role
  size_class: string | null         // Wiki.size_class ← erkul.data.size
  pad_type: string | null           // UEX.pad_type
  production_status: string | null  // Wiki.production_status

  // ---- flag block (UEX booleans, packed) ----
  // Instead of 37 int columns, this is a single bitfield int with a helper
  // in packages/db for reading/writing. See §7 for the flag order.
  flags: number                     // UEX is_* booleans

  // ---- structured JSON blocks ----
  dimensions: {                     // Wiki.sizes ← erkul.vehicle.size ← UEX.{length,width,height}
    length: number | null
    beam: number | null
    height: number | null
  } | null

  mass: {                           // Wiki mass_* ← UEX.mass
    hull: number | null
    loadout: number | null
    total: number | null
  } | null

  cargo: {                          // Wiki ← UEX
    scu: number | null
    vehicle_inventory: number | null
    container_sizes: string | null
  } | null

  crew: {                           // Wiki.crew ← UEX.crew (parsed)
    min: number | null
    max: number | null
    weapon: number | null
  } | null

  fuel: {                           // erkul ← Wiki ← UEX
    hydrogen_capacity: number | null
    intake_rate: number | null
    quantum_capacity: number | null
  } | null

  combat: {                         // erkul ← Wiki
    health_hp: number | null
    shield_hp: number | null
    shield_regen: number | null
    shield_face_type: string | null
    hull_hp_tree: HullRegion | null // erkul-only: recursive region tree
  } | null

  mobility: {                       // erkul ← Wiki
    scm: number | null
    max: number | null
    boost_forward: number | null
    boost_backward: number | null
    zero_to_scm: number | null
    zero_to_max: number | null
    angular_velocity: { x: number; y: number; z: number } | null
    afterburner: AfterburnerSpec | null
  } | null

  weapon_snapshot: {                // Wiki.weapon_snapshot ← derived from erkul.loadout
    pilot_guns: number | null
    turrets_manned: number | null
    turrets_remote: number | null
    missile_racks: number | null
    missiles: number | null
    countermeasures: number | null
  } | null

  loadout: LoadoutPort[] | null     // erkul.loadout (full port tree); null if no erkul hit

  emission: {                       // Wiki.emission
    ir: number | null
    em_idle: number | null
    em_max: number | null
  } | null

  // ---- images (we host the canonical render) ----
  image_canon: string | null        // local path, e.g. "/assets/ships/avenger-stalker-1920.webp"
  image_card: string | null         // local path, 16:9 crop
  image_set: string[] | null        // extra RSI photos (URLs only, not hosted)

  // ---- links ----
  url_store: string | null          // UEX.url_store
  url_brochure: string | null       // UEX.url_brochure
  url_hotsite: string | null        // UEX.url_hotsite
  url_video: string | null          // UEX.url_video
  url_wiki: string | null           // Wiki.web_url

  // ---- loaners ----
  loaners: number[] | null          // UEX.ids_vehicles_loaners (parsed CSV)

  // ---- lore ----
  lore: string | null               // Wiki.description ← erkul.data.description

  // ---- RSI cross-ref ----
  rsi_id: number | null             // RSI ship-matrix id; needed for the .ctm CDN URL (see §4.7)

  // ---- 3d ----
  model_ctm: string | null          // local path to .ctm file, e.g. '/ships/avenger-stalker.ctm' (see §4.7)
  model_ctm_bytes: number | null    // file size for preload hints
  model_ctm_checked_at: number | null  // last .ctm fetch attempt (ms since epoch)
  model_glb: string | null          // manual-scp .glb fallback path (MOCKUP.md pipeline)

  // ---- IFCS raw fields (hoisted out of mobility_json for derived-field computation, see §4.5.1) ----
  mass_empty_kg: number | null      // hull-only mass
  mass_loadout_kg: number | null    // default-loadout mass
  thrust_main_n: number | null      // sum of main thrusters
  thrust_retro_n: number | null     // sum of retro thrusters
  thrust_lateral_n: number | null   // sum of lateral thrusters
  thrust_vertical_n: number | null  // sum of vertical (VTOL) thrusters
  torque_x_nm: number | null        // pitch axis torque
  torque_y_nm: number | null        // yaw axis torque
  torque_z_nm: number | null        // roll axis torque
  cargo_max_scu: number | null      // hoisted from cargo_json.scu for indexable filter

  // ---- Signature raw fallbacks (per-component sums in API at read time, see §1.d) ----
  ir_signature_base: number | null  // base IR used when component coefficients are missing
  em_signature_base: number | null  // base EM fallback
  cs_signature_base: number | null  // base cross-section fallback

  // ---- bookkeeping ----
  data_sources: string              // JSON: {uex: ts, wiki: ts, erkul: ts, rsi: ts, scunpacked: ts}
  data_freshness_warning: number    // 0 or 1; 1 if any critical source is stale > 7d
  game_version: string | null
  date_added: number | null
  date_modified: number | null
  updated_at: number                // not null by design
}

interface HullRegion {
  name: string
  hp: number
  parts?: HullRegion[]
}

interface LoadoutPort {
  port_name: string                 // erkul.loadout[].itemPortName
  local_name: string | null
  editable: boolean
  max_size: number
  min_size: number
  item_types: string[]              // erkul.itemTypes[].type
  required_tags: string | null
  default_item_uuid: string | null  // erkul default component ref
  children?: LoadoutPort[]          // recursive: hardpoints can contain sub-hardpoints
}
```

**NOT NULL by design:** `id`, `slug`, `name`, `flags`, `updated_at`,
`data_sources`, `data_freshness_warning`. Everything else is nullable because
any of our sources can be silent on any field.

```ts
// packages/db/src/schema/item.ts
interface ItemRow {
  id: number                        // UEX.id
  slug: string                      // UEX.slug
  uuid: string | null               // UEX.uuid ← erkul.data.ref (RSI ref)
  name: string                      // UEX.name
  kind: string                      // see §2 Item.kind enum list
  subkind: string | null            // e.g. for fps-weapon: 'smg' | 'rifle' | …
  size: number | null               // UEX.size (component size 0–10)
  grade: string | null              // UEX.quality (A/B/C/D)
  manufacturer: string | null
  image: string | null              // UEX.screenshot (hosted by UEX, not us)

  stats: ItemStats | null           // erkul typed blob; shape depends on kind (discriminated union)
  description: string | null        // UEX ← Wiki ← erkul

  url_store: string | null          // UEX.url_store

  flags: number                     // pledge / subscriber / concierge exclusive (3 bits)

  data_sources: string              // JSON {uex: ts, erkul: ts, wiki: ts}
  game_version: string | null
  date_added: number | null
  date_modified: number | null
  updated_at: number
}

type ItemStats =
  | ShipGunStats
  | MissileStats
  | ShieldStats
  | QuantumDriveStats
  | CoolerStats
  | PowerPlantStats
  | MiningLaserStats
  | FpsWeaponStats
  | FpsArmorStats
  | { kind: 'misc'; raw: Record<string, unknown> }

// Example:
interface ShipGunStats {
  kind: 'ship-gun'
  damage_type: string               // 'energy' | 'ballistic'
  alpha_damage: number | null
  fire_rate: number | null          // rounds/min
  dps: number | null
  ammo_speed: number | null
  fire_range: number | null
  capacity: number | null
  recoil: number | null
}
```

**NOT NULL by design:** `id`, `slug`, `name`, `kind`, `flags`, `updated_at`,
`data_sources`.

```ts
// packages/db/src/schema/commodity.ts
interface CommodityRow {
  id: number
  slug: string
  name: string
  code: string | null
  kind: string | null
  weight_scu: number | null
  price_buy: number | null          // UEX base price (NOT terminal-specific)
  price_sell: number | null         // UEX base price
  flags: number                     // packed UEX commodity flags
  wiki_url: string | null
  lore: string | null               // Wiki
  image: string | null              // Wiki
  data_sources: string
  date_added: number | null
  date_modified: number | null
  updated_at: number
}
```

**NOT NULL by design:** `id`, `slug`, `name`, `flags`, `updated_at`,
`data_sources`.

```ts
// packages/db/src/schema/location.ts
interface LocationRow {
  id: string                        // "{kind}:{uex_id}" to avoid collision across UEX kind endpoints
  uex_id: number | null             // the original UEX integer id (null for synthetic nodes)
  kind: 'system' | 'planet' | 'moon' | 'city' | 'station' | 'outpost' | 'poi' | 'jump_point'
  slug: string                      // canonical slug, unique across kinds
  parent_id: string | null          // self-FK
  name: string
  code: string | null
  faction: string | null
  jurisdiction: string | null
  flags: number                     // packed
  pad_types: string | null
  wiki_url: string | null
  lore: string | null
  image: string | null              // local path or remote URL
  coords: { x: number; y: number; z: number } | null  // LATER
  atmosphere: {                     // ONLY set when kind='planet' or kind='moon'; see §2 Location / Gap 9 (v2 scope)
    altitude_m_to_density_kgm3: Array<[number, number]>  // piecewise-linear curve
  } | null
  data_sources: string
  date_added: number | null
  date_modified: number | null
  updated_at: number
}
```

**NOT NULL by design:** `id`, `kind`, `slug`, `name`, `flags`, `updated_at`,
`data_sources`.

```ts
// packages/db/src/schema/terminal.ts
interface TerminalRow {
  id: number                        // UEX.id
  slug: string                      // generated "{location_slug}-{name_slug}"
  location_id: string               // FK to Location
  name: string
  code: string | null
  type: string | null
  flags: number
  max_container_size: number | null
  mcs: number | null
  screenshot: string | null         // UEX-hosted URL
  screenshot_author: string | null
  data_sources: string
  date_added: number | null
  date_modified: number | null
  updated_at: number
}
```

**NOT NULL by design:** `id`, `slug`, `location_id`, `name`, `flags`,
`updated_at`, `data_sources`.

```ts
// packages/db/src/schema/shop.ts
interface ShopRow {
  id: number                        // synthetic autoincrement
  terminal_id: number
  subject_kind: 'item' | 'vehicle'
  subject_id: number                // local Item.id or Vehicle.id
  price_buy: number | null
  price_sell: number | null         // null for vehicle shops (no sell-back)
  stock_status: number | null       // UEX status_buy/status_sell
  faction_affinity: number | null
  updated_at: number
  // unique index on (terminal_id, subject_kind, subject_id)
}
```

## 7. Schema design recommendation

Final table list, **27 total**. Blueprint is **v1 scope** (promoted from v2 because
of alpha 4.7 crafting). Six new support tables unlock queries no existing SC
tool answers.

| Table                         | Why it exists                                                        |
|-------------------------------|----------------------------------------------------------------------|
| `vehicles`                    | Ships + ground vehicles. JSON columns consolidate the old `_extras`. Hoisted IFCS/thrust/signature columns for derived-field API (§4.5). |
| `items`                       | Every loadout / FPS / component item, `kind`-separated.              |
| `item_attributes`             | N:M: kept as side table because attributes are independently queryable ("all items with recoil < 5"). |
| `commodities`                 | Tradables, refinables, mineables.                                    |
| `locations`                   | Unified tree with self-FK (was 5 tables: planets/moons/cities/stations/outposts). `atmosphere_json` column for planets/moons. |
| `terminals`                   | Trade points. FK to locations.                                       |
| `jump_points`                 | Edge table for system graph.                                         |
| `shops`                       | Denormalized "where to buy X" rows. Sourced from BOTH UEX `items_prices` and cstone shop scrape. |
| `price_snapshot`              | Append-only. One row per (subject, terminal, fetched_at). Replaces 6 old price tables. |
| `refinery_methods`            | Tiny static table. Kept standalone because it has its own semantics. |
| `refinery_yields`             | N:M: commodity × method yield.                                       |
| `commodities_routes`          | UEX-computed routes. Kept because a good trade tool wants these.     |
| `blueprints`                  | sc-craft.tools + SCMDB recipes. JSON columns for ingredients tree. **v1 scope** (alpha 4.7 crafting). |
| `item_crafts_into`            | Materialized reverse-index for "what does this item craft into?" (see Blueprint section of §2). Rebuilt after each `refresh-blueprints` run. |
| `change_log`                  | **NEW** — field-level audit (§1.a). Powers the "patch notes for this ship" UX. |
| `component_damage_map`        | **NEW** — per-component physical damage resistance by type (§1.b). The psychopath differentiator. |
| `loot_table`                  | **NEW** — container/mission drop table header (§1.c). v2 fetcher, v1 schema slot. |
| `loot_table_entry`            | **NEW** — individual loot drop rows (item × probability × qty range). v2 fetcher, v1 schema slot. |
| `item_signature_coefficients` | **NEW** — per-component IR/EM/cross-section multipliers for computed ship-level signatures (§1.d). |
| `localization`                | **NEW** — multi-language display strings from `github.com/starcitizen-localization/*` (§1.e). |
| `source_override`             | Manual field-level override table (see §3).                          |
| `cache_http`                  | Tier-2 HTTP response cache.                                          |
| `cache_large`                 | Small index to large blobs stored on disk (for things like erkul_all.json, wiki_mining.json). |
| `refresh_log`                 | Job run audit (run-level). Complementary to `change_log` (field-level). |
| `fetch_lock`                  | Exclusive lock rows used by cron to avoid concurrent runs.           |
| `schema_migrations`           | Drizzle-managed migrations table.                                    |
| `game_version`                | Single-row watermark tracking the last seen `liveVersion` from erkul — drives `version-watch` triggering. |

**Old: 28. New: 27** — nearly flat in count, but with a decisively different
composition: **−10 redundant tables** (the 5 location sub-tables, 5 price
sub-tables, the `vehicles_extras` spill) **+ 9 new tables** that unlock
differentiator queries (change_log, component_damage_map, loot_table,
loot_table_entry, item_signature_coefficients, localization, item_crafts_into,
blueprints, game_version). The win is not table count — it's clean
consolidation of the ceremonial tables plus additive new tables that each
answer a question no existing SC tool answers.

### JSON column pattern

Drizzle's `text({ mode: 'json' }).$type<DimensionsBlock>()` gives us typed JSON
columns. Use it for:

- `Vehicle.dimensions`, `.mass`, `.cargo`, `.crew`, `.fuel`, `.combat`,
  `.mobility`, `.weapon_snapshot`, `.loadout`, `.emission`, `.image_set`,
  `.loaners`, `.data_sources`
- `Item.stats`, `.data_sources`
- `Commodity.data_sources`
- `Location.coords`, `.data_sources`
- `Terminal.data_sources`
- `SourceOverride.value`

Rule of thumb: if you read it as a whole object every time and you *never*
filter/sort on an individual sub-field, it's a JSON column. If you ever say
"SELECT * WHERE shield_hp > 10000", it gets hoisted out of JSON into a real
column. `shield_hp` is NOT hoisted because the filter UI runs in-process on a
cached array, not a SQL `WHERE` — 300 ships fit in RAM twenty times over.

### Flag packing

The old schema had 37 `is_*` boolean int columns on `vehicles`. The new one
has a single `flags` integer with named helpers:

```ts
// packages/db/src/schema/vehicle-flags.ts
export const VEHICLE_FLAGS = {
  addon: 1 << 0,
  boarding: 1 << 1,
  bomber: 1 << 2,
  cargo: 1 << 3,
  // …
  spaceship: 1 << 31,
} as const
```

Storage goes from 37 × 1-byte-per-int = 37 bytes/row to 8 bytes/row (a single
SQLite integer). More importantly, adding a new flag is one enum line, not a
migration.

Caveat: SQLite integer indexing on bitwise flags is slower than a dedicated
boolean column. For the hot-path filter `is_spaceship = 1` used by
`refresh-wiki` and the catalog list, we keep a generated column
`is_spaceship INTEGER GENERATED ALWAYS AS (flags & 2147483648 != 0) STORED`
with an index. Other flags stay unindexed — the ship catalog is 300 rows,
filtering is in-memory.

## 8. Fetcher pseudocode

### refresh-static (daily)

```
refresh-static:
  1. Acquire fetch_lock (insert row 'refresh-static' with finishedAt=null)
     — if a row already exists with null finishedAt, another run is in-flight, bail
  2. for source in [UEX_vehicles, UEX_commodities, UEX_categories, UEX_items_by_category, UEX_refineries_methods, UEX_refineries_yields]:
       url = build source URL
       cached = cache_http.get(source, url)
       if cached and not cached.expired:
         body = cached.body
       else if cached and cached.has_conditional_validator:
         resp = fetch(url, If-None-Match=cached.etag, If-Modified-Since=cached.last_modified)
         if resp.status == 304:
           cache_http.touch(cached.id, new fetched_at)
           body = cached.body
         else:
           body = resp.body
           cache_http.upsert(source, url, body, resp.headers)
       else:
         resp = fetch(url)
         zod.parse(resp.body)   // fail loud on shape change
         body = resp.body
         cache_http.upsert(source, url, body, resp.headers)
  3. aggregator:
       for row in parsed_rows:
         canonical = mergeSources(row, wikiBySlug, erkulBySlug, overrideTable)
         upsertVehicle(canonical)   // Drizzle upsert on id
     — NOTE: refresh-static does NOT hit Wiki or erkul. It calls into the
       aggregator with nulls for those sources and they stay at the values
       the last refresh-wiki/refresh-erkul wrote. The aggregator is
       idempotent over null inputs.
  4. diff:
       compare new row to old row by id; if every field is equal, skip the
       upsert. This keeps updated_at meaningful (only changed rows move).
  5. refresh_log.insert(job='refresh-static', rows_updated=N, duration=ms, status='ok')
  6. release fetch_lock (update row with finishedAt=now)
```

### refresh-prices (every 15m)

```
refresh-prices:
  1. Acquire fetch_lock('refresh-prices')
  2. terminal_ids = SELECT id FROM terminals WHERE is_available_live = 1
  3. for t in terminal_ids:      // parallelism-limited by the 120 req/min limiter
       rows = uex.getCommoditiesPrices(t)   // rate-limited, cached
       for r in rows:
         insertPriceSnapshot({
           subject_kind: 'commodity',
           subject_id: r.id_commodity,
           terminal_id: t,
           price_buy: r.price_buy,
           price_sell: r.price_sell,
           scu_buy: r.scu_buy,
           scu_sell: r.scu_sell,
           status_buy: r.status_buy,
           status_sell: r.status_sell,
           game_version: r.game_version,
           fetched_at: now
         })
  4. purge_price_snapshot_history(older_than=90d)
  5. rebuild_latest_prices_view()   // materialized CTE on insert
  6. refresh_log.insert(...)
  7. release fetch_lock
```

### refresh-wiki (weekly)

```
refresh-wiki:
  1. Acquire fetch_lock('refresh-wiki')
  2. pages = [1..last_page]
  3. for page in pages:
       body = cached_fetch('wiki', wiki_list_url(page), ttl=7d)
       for v in body.data:
         wikiBySlug[v.slug] = toWikiVehicleRow(v)
  4. aliasMap = buildAliasMap(uexSpaceshipSlugs, wikiBySlug)    // slug rewrites, from old code
  5. for uexSlug in uexSpaceshipSlugs:
       wikiSlug = aliasMap[uexSlug] ?? uexSlug
       wikiRow = wikiBySlug[wikiSlug]
       if wikiRow:
         // update the Wiki-sourced fields on the canonical Vehicle row
         patchVehicleWikiFields(uexSlug, wikiRow)
  6. refresh_log.insert(...)
  7. release fetch_lock
```

### refresh-erkul (weekly)

```
refresh-erkul:
  1. Acquire fetch_lock('refresh-erkul')
  2. if cached erkul_all.json in cache_large is fresh (< 7d):
       body = read(cache_large)
     else:
       try:
         body = fetch('https://www.erkul.games/.../all.json')    // or scrape by rendering
         write(cache_large, body)
       except:
         log error, fall back to last cache_large entry
         set data_freshness_warning on all erkul-sourced vehicles
  3. data = json.parse(body)
  4. erkulByName = index by data.ships[].data.name (mapped to slug via slugify)
  5. for vehicle in vehicles:
       erkulShip = erkulByName[vehicle.slug]
       if erkulShip:
         patchVehicleErkulFields(vehicle, erkulShip)
         // populates combat.hull_hp_tree, mobility.*, fuel.*, loadout[]
  6. also update items table from data.weapons/shields/qdrives/coolers/power_plants/…
     — each item kind maps to Item.stats_json with the kind-specific discriminated union
  7. refresh_log.insert(...)
  8. release fetch_lock
```

### refresh-images (on-detect)

```
refresh-images:
  1. Acquire fetch_lock('refresh-images')
  2. missing = SELECT slug, url_store FROM vehicles WHERE image_canon IS NULL
  3. for v in missing:
       rsi_url = deriveShipMatrixUrl(v.slug)      // known RSI pattern
       body = cached_fetch('rsi', rsi_url, ttl=3d)
       if body:
         raw = downloadPrimaryRender(body)        // the big hero shot
         sharp.resize(raw, [1920, 800, 400]).toWebp().writeTo(data/ships/{slug}-{w}.webp)
         UPDATE vehicles SET image_canon='/assets/ships/{slug}-1920.webp',
                              image_card='/assets/ships/{slug}-800.webp'
           WHERE slug = v.slug
  4. release fetch_lock
```

## 9. Failure modes

| Source          | Failure mode                           | Site behavior                                                                 |
|-----------------|----------------------------------------|-------------------------------------------------------------------------------|
| UEX 5xx         | HTTP 503 / network timeout             | refresh-prices skips the failed tick. Cached Tier-2 body (up to 24h stale) is used. Every affected entity gets `data_freshness_warning=1`. Site shows the latest prices we have, with a small "stale" badge next to them. **Last-resort fallback: yesterday's `data/uex-snapshots/*.json` (uex-snapshot job).** |
| UEX schema change | Zod parse fails                      | Fetcher logs full error to `refresh_log`, refreshes nothing. Previous run's rows stay in place. Alert shows in `/admin` panel. |
| UEX `assets.uexcorp.space` 503 | image CDN broken in browsers (per SOURCES.md §1) | Already routed around: we never serve `url_photo` to clients. Vehicle images come from RSI ship-matrix. |
| UEX 429         | rate limit hit                         | RateLimiter already queues requests below 115/min (5/min budget for ad-hoc), this should be a fetcher bug if it ever happens. Alert on `refresh_log` 429 count. |
| Wiki 5xx        | HTTP 500                               | refresh-wiki bails, vehicles keep their existing Wiki-sourced fields (we never overwrite non-null with null). Site still works. |
| Wiki gibberish  | Unexpected payload shape (HTML instead of JSON for ambiguous slugs — SOURCES.md §2) | Guard with `text.startsWith("{")` before `JSON.parse`. On miss, keep the last-good wiki snapshot from `cache_http`. Log a warning. |
| Wiki vehicle.description = `[]` | Empty array instead of string (SOURCES.md §2 known issue) | The toRow mapper guards: `typeof v.description === 'string' ? v.description : null`. Already in old code, keep it. |
| RSI URL pattern changes | ship-matrix CDN layout shift   | refresh-images alerts, does nothing. Site keeps serving the already-downloaded local images. New ships just render without an image until we fix the pattern. |
| RSI Cloudflare blocks our UA | client.fetch returns 403       | Use plain `curl/8.x` UA per SOURCES.md §3 (`Sec-Fetch-*` browser headers get blocked). Server-side fetch only. |
| erkul scrape blocked | 403/429 from erkul              | refresh-erkul falls back to the local `~/sc-data/erkul_all.json` bootstrap copy. Flag stale > 14d as warning on every erkul-sourced field. |
| erkul_all.json malformed | JSON parse error             | Same as above: fall back to last known good, log, keep serving. |
| cstone 5xx      | finder.cstone.space down               | refresh-cstone bails. UEX `items_prices` continues to cover the major terminals. Smaller shops simply don't update — flag with `data_freshness_warning`. Local cstone_all.json (4.5 MB) is the one-shot bootstrap. |
| cstone schema drift | unexpected field names             | Zod schema fails loud. Component data falls back to erkul (which covers the same items but with different field names). |
| sc-craft.tools 5xx | crafting endpoint down              | refresh-blueprints bails. Crafting page shows the last-known recipe set, badged stale. Local `~/sc-data/blueprints.json` is the cold-start. |
| wiki_mining.json missing | Local 215 MB file deleted    | refresh-static won't crash — wiki_mining is a bootstrap-only enrichment. Items are still populated by UEX/erkul/cstone. FPS gear coverage drops. |
| scunpacked git pull failure | network/repo gone           | Optional source. Skip the pull, use the last-cloned copy in `data/scunpacked/`. |
| unp4k extraction failure | 3D models not available (LATER) | `Vehicle.model_glb = null`, ship viewer shows a placeholder. Non-blocking. |
| SQLite corruption | Disk/power issue                     | Nightly backup to `~/sc-data-backup/` (already established from the old SC bot project). Restore, re-run all refresh jobs. The Pi has been the source of fsck issues before — see `~/.claude/projects/-home-pedro/memory/project_rpi.md`. |

Rule: **no source failure can take the site down.** The UI must render every
page from SQLite alone, even if every external service has been dead for a
week. Stale data is infinitely better than a 500 page.

## 10. Bootstrap from local data (`~/sc-data/`)

Pedro's Python scraper pre-built a corpus of JSON and one SQLite DB. These
let us pre-populate sc.db for offline dev and as a cold-start safety net.

### The source files

| File                              | Size    | What it is                                                |
|-----------------------------------|---------|-----------------------------------------------------------|
| `~/sc-data/uex_all.json`          | 61 KB   | UEX master index (systems + a few top-level lists)        |
| `~/sc-data/uex_commodities.json`  | 112 KB  | UEX /commodities/ response (191 commodities)              |
| `~/sc-data/uex_commodity_prices.json` | 6.0 MB | UEX /commodities_prices/ snapshot — most expensive thing to refetch |
| `~/sc-data/uex_item_prices.json`  | 820 KB  | UEX /items_prices/ subset (~590 rows)                     |
| `~/sc-data/uex_mining.json`       | 30 KB   | UEX mining items                                          |
| `~/sc-data/uex_terminals.json`    | 1.1 MB  | UEX /terminals/ response (824 terminals)                  |
| `~/sc-data/erkul_all.json`        | 20 MB   | Full erkul scrape: ships(208), weapons(147), shields(64), coolers(73), power_plants(76), qdrives(57), mining_lasers, modules, missiles, utilities. Version `4.7.0-LIVE.11518367`. This is the gold mine. |
| `~/sc-data/wiki_blueprints.json`  | 2 B     | Empty list `[]` — failed scrape, ignore.                  |
| `~/sc-data/wiki_mining.json`      | 215 MB  | **MISNAMED**: per SOURCES.md §15, this is the full `/api/v2/items` dump (~59,391 rows incl. FPS gear, paints, doors, displays). Treat as `wiki_items_full.json`. Use lazy line-streaming, NOT a single `JSON.parse` (Pi will OOM). |
| `~/sc-data/cstone_all.json`       | 4.5 MB  | Full Citizen Stone scrape: 19 component categories + 601 shops + ~24k shop items |
| `~/sc-data/cstone_shops.json`     | 56 KB   | 9 hand-picked shops (subset of cstone_all.shops)          |
| `~/sc-data/blueprints.json`       | 2.4 MB  | sc-craft.tools blueprint dump (1040 blueprints)           |
| `~/sc-data/all_shop_paths.json`   | 65 KB   | The 601 shop paths cstone exposes — shop scrape loop driver |
| `~/sc-data/mining_heads_cstone.json` | 24 KB | 18 mining heads with raw CryXML field names              |
| `~/sc-data/sc.db`                 | 6.5 MB  | Python scraper SQLite (INCOMPATIBLE schema, requires transform) |

### Transform layer for `~/sc-data/sc.db`

Per SOURCES.md §15, sc.db is **half-populated**: the component / loadout /
blueprint / shop tables are gold, the `ships` / `commodities` /
`commodity_prices` / `terminals` tables are EMPTY (the scraper failed those
inserts). Verified row counts:

```
ships                  0      EMPTY (broken) — refill from erkul/UEX
ship_loadouts          2,013  erkul (via extract_loadouts.py)
ship_weapons           146    cstone
shields                65     cstone
power_plants           76     cstone
coolers                73     cstone
quantum_drives         57     cstone
mining_heads           18     cstone (raw CryXML field names)
mining_modules         27     cstone
mining_gadgets         30     wiki
fps_weapons            296    cstone
fps_items              452    wiki
blueprints             1,040  sc-craft
blueprint_ingredients  2,701  sc-craft
crafting_resources     30     sc-craft
locations              169    UEX cached
shops                  23,985 cstone — THE GEM
commodities            0      EMPTY — use uex_commodities.json
commodity_prices       0      EMPTY — use uex_commodity_prices.json
terminals              0      EMPTY — use uex_terminals.json
vehicle_purchases      0      EMPTY — refetch live
vehicle_rentals        0      EMPTY — refetch live
```

The old Python schema uses different table/column names and has lower
resolution than UEX. But the *populated* tables — especially `shops` (23,985
rows of FPS shop inventory) and `blueprint_ingredients` (2,701) — are
priceless for offline cold-start.

Shape diff (old Python → new Drizzle):

```
ships                 → vehicles (low-fi: name, manufacturer, scu, crew, mass only)
ship_loadouts         → subsumed by erkul_all.json (higher fidelity), skip unless erkul missing
ship_weapons          → items where kind='weapon-ship-gun', partial stats
shields               → items where kind='shield'
coolers               → items where kind='cooler'
power_plants          → items where kind='power-plant'
quantum_drives        → items where kind='quantum'
mining_gadgets        → items where kind='mining-module'
mining_heads          → items where kind='mining-laser'
mining_modules        → items where kind='mining-module'
fps_items             → items where kind∈{fps-weapon,fps-armor,fps-helmet,fps-undersuit,fps-medical}
fps_weapons           → items where kind='fps-weapon'
commodities           → commodities
commodity_prices      → (empty in the snapshot, 0 rows)
item_prices           → price_snapshot where subject_kind='item'
locations             → locations
terminals             → terminals
refinery_methods      → refinery_methods
blueprints            → blueprints (v1 scope now; use sc-craft.tools for the live refresh and the legacy sc.db rows as a NULL-only bootstrap)
blueprint_*           → blueprints.ingredients_json (JSON-ified recipe tree, see §2 Blueprint schema)
shops                 → shops (pre-joined with terminal name; split shop→terminal_id during transform)
vehicle_purchases     → shops (subject_kind='vehicle', 0 rows in snapshot)
vehicle_rentals       → (no separate table in new schema; merged into shops as a vehicle rental row; low priority)
```

Transform job: `packages/sc-data/src/scripts/import-local.ts`. One-shot
script that opens `~/sc-data/sc.db` with `bun:sqlite`, reads each old table,
maps columns to the new shape, writes into Drizzle with `onConflictDoUpdate`.

Precedence: local import fills NULL columns only. If a later `refresh-static`
run writes a non-null value, we don't overwrite it from local-import on the
next run. The local-import is explicitly the lowest-priority source in the
merge chain.

Offline-first recipe:
1. `bun run packages/sc-data/src/scripts/import-uex-snapshots.ts` — loads
   `uex_commodities.json`, `uex_commodity_prices.json`, `uex_item_prices.json`,
   `uex_terminals.json`, `uex_mining.json` into the new schema. Fast (~2s).
2. `bun run packages/sc-data/src/scripts/import-erkul.ts ~/sc-data/erkul_all.json`
   patches ships with erkul data and populates the items table from the
   weapons/shields/coolers/power-plants/qdrives/mining-lasers/modules/missiles/utilities
   sub-arrays. Single biggest fill, ~10s.
3. `bun run packages/sc-data/src/scripts/import-cstone.ts ~/sc-data/cstone_all.json`
   patches items with raw CryEngine attributes and writes the 23,985 shop
   rows. ~5s.
4. `bun run packages/sc-data/src/scripts/import-scdb.ts ~/sc-data/sc.db`
   ETLs the populated legacy tables (shops, blueprints+ingredients,
   ship_loadouts) into the new schema. Lowest priority — only fills NULLs.
5. `bun run packages/sc-data/src/scripts/import-wiki-items.ts ~/sc-data/wiki_mining.json`
   stream-parses the 215 MB FPS items dump line by line (NDJSON-style or
   incremental JSON streaming — `JSON.parse` on a 215 MB string will OOM the
   Pi). Fills the long tail of FPS gear. ~30s.
6. At this point the site works entirely offline, using ~day-old data.
7. Enable cron (`CRON_ENABLED=1`) and the normal refresh loop takes over.

## 11. TypeScript typing strategy

### Where canonical types live

Two separate packages, clear separation of concerns:

1. **`packages/db/src/schema/*`** — Drizzle table definitions + row types via
   `$inferSelect` and `$inferInsert`. These are the **persistence types**.
   Nullable matches the DB. JSON columns are typed with `.$type<Block>()`.
2. **`packages/types/src/*`** — the **API surface types**. They're mostly
   re-exports of Drizzle's `$inferSelect` but with:
   - Nullability tightened where the API guarantees a fallback
   - JSON blocks flattened into dotted-path convenience selectors for the UI
   - Discriminated unions for `Item.stats`
   - Zod schemas co-located (for request validation on write endpoints if they ever come)

Import direction:
- `packages/db` has no dependency on `packages/types` (db is lower-level)
- `packages/types` depends on `packages/db` (`import type` only — no runtime)
- `apps/api` imports from both
- `apps/web` imports from `packages/types` only, via the Hono RPC client (see below)

### Hono RPC client → Next.js

Hono RPC gives end-to-end types **without manually re-declaring**. The API
defines routes with their response type inferred from the Drizzle select, and
the client picks that up automatically.

```ts
// apps/api/src/routes/vehicles.ts
import { Hono } from 'hono'
import { db } from '@sc-site/db'
import { vehicles } from '@sc-site/db/schema'

export const vehicleRoutes = new Hono()
  .get('/', async (c) => {
    const rows = await db.select().from(vehicles).all()
    return c.json({ vehicles: rows })   // response type is inferred
  })
  .get('/:slug', async (c) => {
    const row = await db.select().from(vehicles).where(eq(vehicles.slug, c.req.param('slug'))).get()
    if (!row) return c.json({ error: 'not found' }, 404)
    return c.json({ vehicle: row })
  })
```

```ts
// packages/types/src/client.ts
import { hc } from 'hono/client'
import type { AppType } from '@sc-site/api/src/index'
export const apiClient = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!)
```

```tsx
// apps/web/app/ships/page.tsx
import { apiClient } from '@sc-site/types/client'

export default async function ShipsPage() {
  const res = await apiClient.api.vehicles.$get()
  const { vehicles } = await res.json()  // fully typed, no manual shape
  return <ShipGrid vehicles={vehicles} />
}
```

**Rule:** never hand-write a client-side Vehicle type. If the UI needs a
subset, it does `Pick<VehicleRow, 'slug' | 'name' | 'manufacturer'>` at the
use site. Centralizing the type in one file and then re-declaring it in
five places is exactly the kind of ceremony this stack is supposed to kill.

### Why `$inferSelect` over hand-written types

- Schema is the source of truth: if you add a column, every API/UI user of it
  picks it up without edits
- Drizzle's inference knows about nullability, JSON typing, and PK/defaults
- Hand-written types drift; inferred types can't

### When to hand-write

Only for:
- The aggregated `VehicleFullShape` (what the /ships/:slug detail page gets,
  including computed fields like `latest_price`, `loaner_vehicles` resolved,
  `model_glb_exists`) — this is a *view*, not a row
- The `SourceOverride.value` typing — it's a discriminated union on
  `field_path`, which is string-typed in the DB
- Admin-only shapes (refresh_log rollups, health stats)

These live in `packages/types/src/views/*.ts`.

## 12. Summary cheat-sheet

### Source priority one-liners

```
Vehicle    ← UEX (registry + prices spine) ← Wiki (dims, mass, lore, MSRP, signature) ← erkul (combat tree, IFCS, loadout) ← RSI (images + rsi_id for .ctm) ← scunpacked (datamine sanity + damage map)
Item       ← UEX (catalog) ← erkul (typed stats) ← cstone (raw CryEngine attrs) ← Wiki (descriptions) ← wiki_mining.json (FPS bootstrap) ← localization (display names, fr/en/de/es/it/ja)
Commodity  ← UEX (all economy, only source) ← Wiki (lore + image)
Location   ← UEX (entire tree, only source) ← Wiki (lore + image) ← scunpacked Environment/Atmosphere (atmosphere_json, v2)
Terminal   ← UEX (only source)
Shop       ← UEX items_prices (major terminals, live) ← cstone shops (601 long-tail FPS shops, weekly)
JumpPoint  ← UEX (only source)
Blueprint  ← sc-craft.tools (recipes, main) ← SCMDB (source_mission_ids) ← scunpacked (ingredient slot sanity) ← wiki blueprints (lore) — v1
ComponentDamageMap ← scunpacked Vehicles/Damage/*.json (only source)
LootTable  ← SCMDB (main, IF feasible) ← scunpacked Container_Property (fallback) ← manual curation — v2
ItemSignatureCoefficients ← erkul (if exposes c_ir/c_em/c_cs — verify) ← spviewer.eu (fallback, unblock SPViewer for this only)
Localization ← github.com/starcitizen-localization/* (only source — one repo per language)
ChangeLog  ← computed by Transformer diff, not fetched from any source
```

### Refresh cadence at a glance

```
daily 01:00 → uex-snapshot (DR backup)
daily 04:00 → refresh-static (UEX catalog)
daily 04:30 → refresh-locations (UEX tree)
daily 05:00 → cache-sweep
weekly Sun 03:00 → refresh-wiki
weekly Sun 03:30 → refresh-erkul
weekly Sun 04:00 → refresh-cstone
weekly Sun 04:30 → refresh-blueprints (v1 — includes SCMDB mission-drop pass)
weekly Sun 05:00 → refresh-scunpacked (damage map + sanity cross-check)
weekly Sun 05:30 → refresh-localization (git pull 6 lang repos + full replace)
weekly Sun 06:00 → refresh-ship-ctm (HEAD + GET .ctm per ship)
weekly Sun 06:30 → refresh-loot (v2 — no-op until SCMDB scraping lands)
weekly Sun 07:00 → refresh-signatures (conditional on erkul coverage verification)
*/15  min   → refresh-prices
*/30  min   → refresh-routes + version-watch
hourly :15  → refresh-images (on-detect)
```

### Why this layout

- **One Vehicle row, one Item row, one Location row.** Not a constellation of
  5 tables each. Pedro explicitly asked for "tout" on a ship — the canonical
  Vehicle row *has* tout, in one SELECT.
- **Tier-2 HTTP cache in SQL**, not on disk, because it inherits the same
  backup/ACID story as the canonical DB.
- **Source priority by field, override table by slug.** Nothing hand-coded
  about which source wins in the fetcher. The whole merge is table-driven.
- **Failures degrade, never break.** Every fetcher writes to `refresh_log`
  and flags stale entities with `data_freshness_warning` instead of crashing.
- **Bootstrap-friendly.** The whole site runs offline from `~/sc-data/*` as a
  cold-start. Enables Pedro to dev on the Pi without being online.
- **Differentiator queries baked in.** change_log powers "patch notes per
  ship", component_damage_map answers "which ship tanks THIS weapon best",
  loot_table answers "where do I farm this blueprint", localization makes
  the site multi-language for free (default fr), and the IFCS + signature
  compute-on-fetch endpoints answer questions no existing SC tool answers.

---

*End of INGESTION.md. Companion docs: SOURCES.md (source catalog),
MOCKUP.md (visual design). Canonical schema code lives at
`packages/db/src/schema/*.ts`.*
