# Gemini — architecture & deep-extraction dump

**Source**: Gemini, pasted verbatim by Pedro on 2026-04-07. Pedro's framing: *"Ca doit pas être la seule vérité, mais je veux bien que ce soit pris comme une base."*

**Status**: reference material, one voice among several. Cross-check with SOURCES.md (from `data-sources` agent), INGESTION.md (from `ingestion` agent), and Pedro's direct experience (his curated source list in `seed-sources.md`). This dump complements — it does not replace.

---

## Part 1 — Data-mining & raw sources (Gemini's first technical pass)

### 1. P4K-Explorer & Unforge (base extraction tools)
Base tools to extract `Data.p4k`. The critical file is `Global.datasmithenterprise` (or older `.dcb`). That's where the **PropertyStructs** live.

### 2. CryEngine serialization
Star Citizen uses a heavily modified CryEngine. Data is structured as **Records**. **Every entity** (bolt, engine, planet) has a constant **UUID** — that's the **universal primary key** for the SQLite DB.

### 3. `github.com/sc-data/sc-unpacked-data`
The cleanest dump of `Game.xml` converted to JSON. Contains heat curves, damage resistance maps, fuel consumption per thruster. **This is THE foundation** for the static catalog.

### 4. RSI hidden APIs (XHR endpoints)
- **HoloViewer API** — `https://robertsspaceindustries.com/api/investigation/v1/ship/[SHIP_ID]`
  - Returns hardpoint nodes (x/y/z coordinates) for weapon mounts on the 3D model.
  - **Critical for Three.js**: lets us place real weapon markers at real positions on the ship model.
- **Storefront API** — `https://robertsspaceindustries.com/api/store/v2/products`
  - Real-money prices, limited-time stock, SKU metadata.
- **Galactapedia API** — `https://robertsspaceindustries.com/api/galactapedia/getArticle`
  - Official lore by UUID. Links every technical item to its narrative history.

### 5. Physics & flight modeling (IFCS)
- Extract **Thrust Capacities** (linear + rotational), not just top speed.
- Formula: `Acceleration = Thrust / (Mass + Cargo)`. The DB must be able to compute maneuverability as a function of SCU fill — **almost no site does this**.
- **Atmospheric data**: each planet has a density curve (in `Environment/Atmosphere`). Needed to simulate ground-to-orbit travel time.
- **Signatures** (EM/IR/Cross-Section): don't store "the signature". Store **per-component emission multipliers**. A military-grade A generator has a specific `C_ir` coefficient applied to the base energy consumption.

### 6. Niche tools
- **SC-Wiki API (Cargo Bay)** — `https://api.star-citizen.wiki/` — robust aggregator, often used by German orgs.
- **SC Signals** — reverse-engineering of in-game VOIP/FOIP frequencies for proximity metadata.
- **Log parsing (`Game.log`)** — live data: player x/y/z, shard ID, entities loaded in memory. Would need a real-time parser (Gemini originally mentioned Rust here, Pedro reverted to Bun — a `Bun.file().stream()` with incremental parsing works).

### 7. Three.js asset pipeline
- **Starship42 JSON export** — maps ship IDs to `.ctm` models.
- **`.ctm` format** — compressed geometry hosted at `https://robertsspaceindustries.com/media/[SHIP_ID]/source/ship.ctm`. Can be loaded by a three.js CTM loader.
- **CGF-Converter** — transforms `.cgf` / `.skin` (CryEngine) to `.gltf` / `.obj`. Needed if you want ship interiors.
- **Substance materials** — SC shaders are Substance-style. For three.js, either bake the textures or write a custom GLSL shader that simulates the "wear & tear" layers from the `.mtl` files.

### 8. Cross-query schema (the DB brain)
What nobody else does, and what makes the DB "gigantic":
- **Shop_Item entity** — linked to `Item_UUID`
- **Production entity** — linked to `Blueprint_ID` (for 4.0 crafting)
- **Loot_Table entity** — linked to `Mission_ID` + `Container_ID`
- **Final query**: *"what are the chances of looting weapon X in mission Y, and if I don't get it, what's the most profitable trade route in ship Z to go buy it at the best price?"* — this requires 5+ entity join and NO existing SC tool answers it.

### Original Rust advice (Gemini's first pass, before Pedro reverted to Bun)
> "Conseil Rust : Utilise serde_untagged pour parser les JSON de CIG, car leurs structures changent souvent d'un patch à l'autre sans prévenir. SQLite est parfait, mais n'oublie pas d'indexer les colonnes UUID et Name pour des recherches instantanées sur ton front."

**Translated to Bun**: use `z.union` / `z.discriminatedUnion` from Zod for the same flexibility on shifting CIG JSON shapes. Index `uuid` and `name` columns via `CREATE INDEX` in the initial SQL migration.

---

## Part 2 — Deep-extraction follow-up (Gemini second pass)

### 🌑 Dark Data — GitHub & raw projects
- **`sc-unpacked-data`** — same as above, THE foundation.
- **`github.com/starcitizen-localization/`** — all in-game strings (the `.ini` translation files). Mandatory for joining a technical ID (`@item_power_plant_S1`) to its "civilian" name in 5 languages. This makes the DB multi-language for free.
- **`github.com/sc-data/sc-icons`** — all extracted game UI icons. Perfect for illustrating the frontend without missing images.
- **VerseTime** (`github.com/dydrmr/VerseTime`) — scrapes Comm-Links, auto-builds lore timeline.

### 🧪 Niche / data-mining advanced
- **SC-Craft.Tools** (https://sc-craft.tools/) — crafting DB with 1000+ blueprints extracted from game files. Links resources to craftable items. **Critical for Alpha 4.0+ crafting coverage**.
- **SnarePlan** (https://snareplan.dolus.eu/) — the heavy data here is **the geometry of the Verse**: OM (Orbital Marker) coordinates. Useful for quantum interdiction calculations.
- **Regolith** — mining probability data cross-referenced with geography.

### 🛰️ Visualization & 3D (for three.js)
- **Starship42** — 3D ships with performance overlay. Handles the "ship matrix at scale" visualization.
- **FleetYards API** (https://fleetyards.net/api/v1/docs/) — one of the few **documented** community APIs. Lists ships + specs + prices.
- **SPViewer** — sole source for IFCS curves, aerodynamics, and radar signature data.

### 📡 Hidden APIs & lore
- **StarCitizen-API** (https://starcitizen-api.com/) — centralizes Orgs, Spectrum, Hangar RSI data. Useful for joining "social" data with "technical" data.
- **Citizen History** (https://citizen-history.com/) — lore timeline.

### 💡 "Le truc lourd" — Loot tables
> *"Si tu veux vraiment faire un truc gigantesque, tu dois aller chercher les Loot Tables. Actuellement, personne n'a de DB publique parfaite sur quel coffre dans quel bunker contient quel pourcentage de chance d'avoir un Railgun. Pour ça, tu dois parser les fichiers Global.datasmithenterprise et chercher les Container_Property et Loot_Table_Record."*

**The project to clone for understanding**: **HangarXPLOR** on GitHub — manipulates the RSI inventory brutally. Reference implementation for talking to RSI's APIs.

### 🧬 Spatial data & navigation
- **StarMap ARK API** — `https://starmap.cloud.robertsspaceindustries.com/` — RSI's own starmap backend. Sniff the F12 network to find the XHR endpoints for planet/moon/station positions in x/y/z.
- **VerseGuide** — triangulated coordinates for CIG-unmarked places (wrecks, Jumptown).
- **Deep Space Radar** (https://deepspaceradar.com/) — pure geospatial data on mining resources and anomalies.

### 📦 Assets & models (three.js fuel)
- **Starship42 HoloViewer pipeline** — `https://robertsspaceindustries.com/media/[SHIP_ID]/source/ship.ctm`. `.ctm` is a compressed geometry format parseable by a three.js loader.
- **Star Citizen Assets** / **CryTools** / **CGF-Converter** — repos to transform `.cgf` → `.gltf`/`.obj`.
- **SC-Icons** — as above.

### 💹 Economic & network data
- **UEX Corp API** — https://uexcorp.space/api — reference for dynamic economy. Sell terminals, stocks, fluctuating prices.
- **SC-Trade-Tools data dumps** — no public API, but their JS source files (F12) contain complete trade route lists.
- **Star Citizen Signals (Discord)** — radio-interception projects tracking VOIP/FOIP and spatial traffic announcements as data feeds.

### 📜 Lore & context
- **Galactapedia API** — as above.
- **Citizen History** — as above.

### 🛠️ Niche absolute — Component Damage Map
> *"Le 'Component Damage Map'. Dans les fichiers du jeu, chaque item a un `health_threshold` et des multiplicateurs de dommages selon le type d'énergie reçu (Physical, Distortion, Energy, Thermal, Biochemical). Presque personne n'affiche ces données. Si tu les intègres, ton comparateur de vaisseaux devient le plus puissant du marché : tu pourras dire quel vaisseau résiste le mieux à une arme spécifique, non pas par ses boucliers, mais par la résistance physique de ses composants internes."*

**Source**: `Vehicles/Damage/` folder inside `sc-unpacked-data`.

**Schema proposal**: table `component_damage_map`:
```sql
CREATE TABLE component_damage_map (
  component_uuid  TEXT    NOT NULL,
  damage_type     TEXT    NOT NULL,   -- Physical|Distortion|Energy|Thermal|Biochemical
  multiplier      REAL    NOT NULL,
  health_threshold REAL,
  PRIMARY KEY (component_uuid, damage_type),
  FOREIGN KEY (component_uuid) REFERENCES items(uuid)
);
```

This is the **psychopath differentiator** per Gemini.

---

## Part 3 — ETL pipeline architecture (Gemini's third pass, the Bun version)

**Context**: Pedro reverted the backend choice to Bun (was briefly considering Rust). Gemini confirmed Bun is well-suited for this: fast native SQLite, fast file IO, unified language with the Next.js frontend.

### 1. Pipeline layers
Structure the ingestion as a 4-layer pipeline:

- **Fetcher** — polls/watches data sources:
  - GitHub API webhooks or polling on `sc-data/sc-unpacked-data` commits
  - REST calls to UEX, SC-Wiki Cargo Bay, RSI hidden APIs
  - Playwright headless for sites that need JS rendering to reveal internal JSON URLs (CStone, Erkul, SCMDB)
- **Unpacker** — converts raw game files (`.xml`/`.dcb`) to JSON. Mostly a no-op because `sc-unpacked-data` does the work upstream. Keep the module for future direct `unp4k` integration.
- **Transformer** — the "brain". Joins data by UUID. Produces canonical aggregated entities.
- **Loader** — batched `ON CONFLICT DO UPDATE` upserts via `bun:sqlite` transactions.

### 2. Automating the core extraction
Poll `https://api.github.com/repos/sc-data/sc-unpacked-data/commits/live` periodically. If the SHA changes from the last processed, trigger ingestion.

Gemini's example (TypeScript, adapted for Bun):
```ts
const GITHUB_API = "https://api.github.com/repos/sc-data/sc-unpacked-data/commits/live";

async function updateCheck() {
  const response = await fetch(GITHUB_API);
  const { sha } = await response.json();

  if (sha !== lastProcessedSha) {
    console.log("New patch detected! Starting ingestion...");
    await downloadAndInject();
  }
}
```

### 3. UUID cross-join (the fatal join)
Every SC entity has a UUID or a `ClassName`. Mapping scripts:
- **Item ↔ Shop** — scrape CStone Finder's JSON via their internal XHR endpoint.
- **Vehicle ↔ Physics specs** — fetch SPViewer's JSON.
- **Item ↔ Localization** — ingest the `.ini` files from `starcitizen-localization`.

### 4. Bun SQLite loader pattern
```ts
import { Database } from "bun:sqlite";
const db = new Database("starcitizen_gigantic.db");

const insertItem = db.prepare(`
  INSERT INTO items (uuid, name, mass, price_buy, shop_id)
  VALUES ($uuid, $name, $mass, $price, $shop)
  ON CONFLICT(uuid) DO UPDATE SET
    price_buy = excluded.price_buy,
    mass      = excluded.mass;
`);

const transaction = db.transaction((items) => {
  for (const item of items) insertItem.run(item);
});
```

### 5. Headless scraping for moving data
Use **Playwright** or **Puppeteer** on Bun to simulate browser navigation for:
- UEX dynamic price refreshes (if their API doesn't expose everything)
- RSI Store stock changes
- Sites that load their JSON via JS-evaluated script tags

### 6. .ctm bulk download loop for three.js
```
1. Get the full ship list via Ship Matrix API
2. For each ship_id: download https://robertsspaceindustries.com/media/[ship_id]/source/ship.ctm
3. Store to apps/web/public/ships/{uuid}.ctm
4. Frontend Three.js lazy-loads the .ctm on demand via a CTM loader
```

### 7. Hardcore endpoint list (Gemini's final target list)
- **SC-Icons zip**: `https://github.com/sc-data/sc-icons/archive/refs/heads/live.zip` — download, unzip, link paths to UUIDs.
- **Galactapedia**: `https://robertsspaceindustries.com/api/galactapedia/getArticle` — POST with item UUID.
- **SCMDB missions**: scrape `https://scmdb.net/missions` for mission logic files.

### 8. Ideal stack
- **Orchestrator**: `index.ts` running with `bun --watch`.
- **Temp storage**: `/raw_data` folder where JSON dumps from GitHub land before Transformer processes them.
- **No Rust worker needed** — Pedro reverted that decision. Bun's native SQLite + Bun's speed on JSON parsing is enough.

### 9. Final recommendation — `change_log` table
**Critical**. Every ingestion run logs what changed:
```sql
CREATE TABLE change_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           INTEGER NOT NULL,       -- unix ms
  entity_type  TEXT    NOT NULL,       -- 'vehicle' | 'item' | 'shop' | …
  entity_uuid  TEXT    NOT NULL,
  field        TEXT    NOT NULL,       -- column name
  old_value    TEXT,                   -- JSON-stringified
  new_value    TEXT,
  source       TEXT    NOT NULL        -- 'sc-unpacked-data' | 'uex' | 'cstone' | …
);
CREATE INDEX idx_change_log_uuid ON change_log(entity_uuid);
CREATE INDEX idx_change_log_ts   ON change_log(ts DESC);
```

Gemini's pitch: *"C'est la seule façon d'avoir une DB qui suit l'évolution du jeu à 100%."*

**UX implication**: the frontend can render a "Patch notes for this ship" panel driven entirely by `change_log`, showing every spec change since the ship was first added. No other SC tool has this.
