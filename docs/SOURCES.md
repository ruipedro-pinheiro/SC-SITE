# SOURCES.md — Star Citizen data sources catalogue

> Goal: maximum signal, minimum dependence on any single upstream. Every entity should be reachable from at least two sources so the site keeps working when one of them dies (which they all eventually do — see Risk register at the bottom).

This document catalogues every external API, scrape target, file dump, and on-disk asset we can pull SC data from on the Pi. Each section is "load-bearing" — if you remove a source, downstream pages break.

Verification was done from the Raspberry Pi 4 (Tailscale `100.105.42.81`) on **2026-04-07** using `curl` / `WebFetch`. Live data was returned by every endpoint marked **OK** below.

---

## Source × entity matrix

Legend: ✅ first-class, ⚠️ partial / lossy / lag, ❌ not provided.

| Entity                       | UEX 2.0 | SC Wiki v3 | RSI ship-matrix | RSI starmap API | erkul.games | Citizen Stone (cstone) | scunpacked-data git | unp4k (nuclear) | maps.adi.sc GLB | sc.db (local) | wiki_mining.json (local) | erkul_all.json (local) |
| ---                          | :-:     | :-:        | :-:             | :-:             | :-:         | :-:                    | :-:                 | :-:             | :-:             | :-:           | :-:                      | :-:                    |
| Star systems                 | ✅      | ❌         | ❌              | ✅ 90 systems + xyz | ❌      | ❌                     | ✅ starmap.json     | ⚠️              | ❌              | ⚠️ locations  | ❌                      | ❌                     |
| Planets / moons              | ✅      | ❌         | ❌              | ✅ tree          | ❌          | ❌                     | ⚠️ via starmap.json | ⚠️              | ❌              | ⚠️ locations  | ❌                       | ❌                     |
| Cities / stations / outposts | ✅      | ❌         | ❌              | ✅ affiliations  | ❌          | ⚠️ shop locations only | ⚠️                  | ⚠️              | ❌              | ⚠️ locations  | ❌                       | ❌                     |
| Station pad charts           | ❌      | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| Jump points                  | ✅      | ❌         | ❌              | ⚠️ partial       | ❌          | ❌                     | ⚠️                  | ⚠️              | ❌              | ❌            | ❌                       | ❌                     |
| Trade terminals              | ✅      | ❌         | ❌              | ❌               | ❌          | ⚠️ FPS shops only      | ❌                  | ❌              | ❌              | ⚠️ shape only | ❌                       | ❌                     |
| Vehicle catalog (canonical)  | ✅      | ✅         | ✅              | ❌               | ✅          | ❌                     | ✅ ships.json       | ✅              | ❌              | ❌            | ❌                       | ✅ 208 ships           |
| Vehicle dimensions / mass    | ⚠️ basic| ✅ rich    | ✅ rich         | ❌               | ✅ rich     | ❌                     | ✅                  | ✅              | ❌              | ❌            | ❌                       | ✅                     |
| Vehicle combat (HP/shield/turrets) | ❌| ✅         | ⚠️ partial      | ❌               | ✅ best     | ⚠️ via components      | ✅                  | ✅              | ❌              | ❌            | ❌                       | ✅ deepest             |
| Default ship loadouts        | ❌      | ⚠️ summary | ❌              | ❌               | ✅          | ❌                     | ✅ ship-items.json  | ✅              | ❌              | ✅ 2013 rows  | ❌                       | ✅                     |
| Vehicle MSRP / store         | ⚠️ url  | ✅ skus    | ✅              | ❌               | ❌          | ❌                     | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| Vehicle photos (canonical)   | ⚠️ broken assets cdn | ✅ media | ✅ official | ✅ thumbnails per system | ❌ | ❌                    | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| Ship 3D deck geometry        | ❌      | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ✅ .cgf         | ✅ .glb decks 8 capital ships | ❌   | ❌                      | ❌                     |
| Ship weapons stats           | ❌ (items only) | ❌  | ❌              | ❌               | ✅          | ✅ 146 rows            | ✅ ship-items.json  | ✅              | ❌              | ✅ 146 rows   | ❌                       | ✅                     |
| Shields / coolers / power / QD | ❌   | ❌         | ❌              | ❌               | ✅          | ✅                     | ✅ items.json       | ✅              | ❌              | ✅ all 4      | ❌                       | ✅                     |
| Mining heads / modules / gadgets | ❌ | ⚠️ basic   | ❌              | ❌               | ✅ lasers   | ✅ best                | ✅                  | ✅              | ❌              | ✅ all 3      | ❌                       | ✅                     |
| FPS gear (armor / clothing)  | ⚠️ items| ❌         | ❌              | ❌               | ❌          | ❌                     | ✅ fps-items.json 45 MB | ✅          | ❌              | ❌            | ✅ ~5k items             | ❌                     |
| FPS weapons stats            | ⚠️ items| ❌         | ❌              | ❌               | ❌          | ✅ 296 rows            | ✅ fps-items.json   | ✅              | ❌              | ✅ 296 rows   | ✅                       | ❌                     |
| Commodities catalog          | ✅      | ❌         | ❌              | ❌               | ❌          | ❌                     | ⚠️ resource-types.json | ⚠️           | ❌              | ❌            | ✅ "Cargo" type 4995 rows| ❌                     |
| Commodity buy/sell prices    | ✅ best | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| Commodity routes             | ✅      | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| Refinery yields              | ✅      | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| Fuel prices                  | ✅      | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| FPS shops inventories        | ⚠️ items_prices | ❌  | ❌              | ❌               | ❌          | ✅ 601 shops 23985 items | ⚠️ partial        | ❌              | ❌              | ✅ 23985 rows | ❌                       | ❌                     |
| Crafting blueprints + ingredients | ❌| ⚠️ blueprint endpoint | ❌ | ❌               | ❌          | ❌                     | ✅ blueprints.json 5 MB | ✅           | ❌              | ✅ 1040+2701  | ❌                       | ❌                     |
| Factions / affiliations      | ❌      | ❌         | ⚠️              | ✅ per system    | ❌          | ❌                     | ✅ factions/ (new 2026-04-03) | ✅    | ❌              | ❌            | ❌                       | ❌                     |
| In-game localized strings    | ❌      | ❌         | ❌              | ❌               | ❌          | ❌                     | ✅ labels.json      | ✅ Localization/ | ❌             | ❌            | ❌                       | ❌                     |
| Mining resource signal table | ❌      | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ❌              | ❌              | ❌            | ❌                       | ❌                     |
| Patch / version metadata     | ✅ game_version | ✅ version | ⚠️       | ❌               | ✅ live + ptu | ❌                  | ✅ commit msgs      | ✅              | ❌              | ❌            | ✅ 4.7.0                 | ✅ 4.7.0-LIVE.11576750 |
| 3D models (.cgf / .gltf)     | ❌      | ❌         | ❌              | ❌               | ❌          | ❌                     | ❌                  | ✅ cgf→gltf     | ✅ .glb         | ❌            | ❌                       | ❌                     |

> The **station pad charts** and **mining resource signal table** rows have no column covered by our "big" sources — they live in niche sources documented below (deltaconsultingsc.com §16 and Google Sheets §17). Same for the **Halo Belt route planner** (cstone.space §18) and the **cargo grid reference PNGs** (RSI community hub §19).

---

# 1. UEX 2.0 API — `https://api.uexcorp.space/2.0/`

**The single biggest source for the trading-game economy.** Star systems through commodity prices, ~120 req/min, no auth required for reads.

- **Base URL**: `https://api.uexcorp.space/2.0/`
- **Mirror**: `https://uexcorp.space/api/2.0/` (same data, returns identical JSON envelopes — verified)
- **Auth**: PUBLIC for every read endpoint we use. Pedro has a token (`UEX_API_TOKEN` in `~/sc-site-old/.env`) that the legacy client passed via `secret_key:` header — UEX 403s on `Authorization: Bearer …` when the token isn't a 2.0-format bearer. The token is **only required for write endpoints** (price reports). Reads work header-less.
- **Rate limit**: 120 req/min, 172800/day per docs. The legacy client used `RateLimiter(115, 60_000)` — leaving 5 req/min budget for ad-hoc calls.
- **Response envelope** (every endpoint):
  ```json
  {"status":"ok","http_code":200,"data":[ {...rows} ]}
  ```
  `data` is `null` when empty. `status` is `"ok"` on success and a string error otherwise.
- **Docs**: <https://uexcorp.space/api/documentation/>
- **License**: community-reported data, the site asks for attribution. Project page: <https://uexcorp.space/api/community_made>.
- **Status (2026-04-07)**: **OK** — verified `/star_systems`, `/vehicles`, `/categories`, `/refineries_yields` from the Pi, all returned `status:"ok"`.
- **Known issues / pain points**:
  - `assets.uexcorp.space/img/vehicles/...` (the `url_photo` field) **returns 503 from browsers** while curl works. RSI is the preferred image source for browser-side rendering.
  - `secret_key` header is undocumented but still honoured. Public bearer-token endpoints exist for new accounts but the legacy header keeps working — **don't change auth strategy without testing**.
  - Several "list" endpoints require a filter parameter (`/items` needs `id_category`, `/commodities_routes` needs `id_commodity`, `/fuel_prices` needs `id_terminal`, `/items_prices` and `/items_attributes` need `id_item`). Iterating these multiplies request budget linearly — see INGESTION.md.
  - Numeric fields are sometimes serialized as strings; nullable fields use literal `null`. The Zod schema in `~/sc-site-old/packages/sc-data/src/schemas.ts` is permissive (`.passthrough()`, coerced numbers) — we should reuse that exact pattern.
  - `is_*` boolean fields are 0/1 ints, not booleans.

## Endpoint catalogue (verified working)

| Endpoint                       | Required filter   | Approx row count | Refresh class |
| ---                            | ---               | ---              | --- |
| `/star_systems`                | none              | ~25              | static (daily) |
| `/planets`                     | none              | ~50              | static |
| `/moons`                       | none              | ~80              | static |
| `/cities`                      | none              | ~30              | static |
| `/space_stations`              | none              | ~120             | static |
| `/outposts`                    | none              | ~250             | static |
| `/jump_points`                 | none              | ~30              | static |
| `/terminals`                   | none              | ~824 (verified)  | mid (6h) |
| `/vehicles`                    | none              | ~310             | static |
| `/vehicles_purchases_prices`   | none              | ~50              | prices (15min) |
| `/vehicles_rentals_prices`     | none              | ~150             | prices |
| `/commodities`                 | none              | 191 (verified)   | static |
| `/commodities_prices`          | `id_terminal`     | ~5000 total (iterate ~200 trade terminals) | prices |
| `/commodities_routes`          | `id_commodity`    | ~25k total (iterate 191 commodities) | prices |
| `/refineries_methods`          | none              | ~6               | static |
| `/refineries_yields`           | none              | ~3000            | static |
| `/fuel_prices`                 | `id_terminal`     | ~50 (iterate refuel terminals) | prices |
| `/categories`                  | none              | 98 (verified — types: item/service/contract) | static |
| `/items`                       | `id_category`     | ~3500 across 64 item-categories | static |
| `/items_prices`                | `id_item`         | huge — heavy fetch | on-demand |
| `/items_attributes`            | `id_item`         | huge | on-demand |

### Sample envelope (`/vehicles`, truncated)

```json
{"status":"ok","http_code":200,"data":[{
  "id":1,"id_company":195,"id_parent":1,"ids_vehicles_loaners":"",
  "name":"100i","name_full":"Origin 100i","slug":"100i",
  "uuid":"6135a874-4cb1-4f49-9f29-5781e5991f2b",
  "scu":2,"crew":"1","mass":0,"width":12,"height":5,"length":19,
  "fuel_quantum":0,"fuel_hydrogen":0,"container_sizes":"1,2",
  "is_civilian":1,"is_spaceship":1,"is_starter":1,"is_quantum_capable":1,
  "url_photo":"https://assets.uexcorp.space/img/vehicles/1/...jpg",
  "url_store":"https://robertsspaceindustries.com/pledge/ships/origin-100/100i",
  "url_brochure":"https://robertsspaceindustries.com/media/.../Origin-100-Series-Brochure-FINAL.pdf",
  "pad_type":null,"game_version":null,
  "company_name":"Origin Jumpworks","date_added":1682371193,"date_modified":1755193819
}]}
```

### Vehicle field list (the `vehicleSchema` in `~/sc-site-old/packages/sc-data/src/schemas.ts`)

```
id, id_company, id_parent, ids_vehicles_loaners, name, name_full, slug, uuid,
scu, crew, mass, width, height, length, fuel_quantum, fuel_hydrogen,
container_sizes, pad_type, game_version, company_name, date_added, date_modified,
url_photo, url_store, url_brochure, url_hotsite, url_video, url_photos,
+ 36 boolean role flags:
is_addon, is_boarding, is_bomber, is_cargo, is_carrier, is_civilian,
is_concept, is_construction, is_datarunner, is_docking, is_emp, is_exploration,
is_ground_vehicle, is_hangar, is_industrial, is_interdiction, is_loading_dock,
is_medical, is_military, is_mining, is_passenger, is_qed, is_racing, is_refinery,
is_refuel, is_repair, is_research, is_salvage, is_scanning, is_science,
is_showdown_winner, is_spaceship, is_starter, is_stealth, is_tractor_beam,
is_quantum_capable
```

**Fields NOT in the UEX vehicle row**: shield_hp, scm_speed, max_speed, signature, agility, weapon_snapshot, cargo_grids, parts, turrets, MSRP. For all that, you need SC Wiki / RSI / erkul / scunpacked.

### Commodity price field list

```
id, id_commodity, id_terminal, id_star_system, id_planet, id_orbit, id_moon,
id_city, id_outpost, id_poi, id_faction, container_sizes, game_version,
price_buy, price_buy_min, price_buy_min_week, price_buy_min_month,
price_buy_max, price_buy_max_week, price_buy_max_month,
price_buy_avg, price_buy_avg_week, price_buy_avg_month,
price_sell, price_sell_min, price_sell_min_week, price_sell_min_month,
price_sell_max, price_sell_max_week, price_sell_max_month,
price_sell_avg, price_sell_avg_week, price_sell_avg_month,
scu_buy, scu_buy_min, scu_buy_max, scu_buy_avg,
scu_sell, scu_sell_min, scu_sell_max, scu_sell_avg,
status_buy, status_sell, faction_affinity,
commodity_name, commodity_code, commodity_slug,
star_system_name, planet_name, orbit_name, moon_name, city_name, outpost_name,
space_station_name, terminal_name, terminal_code, terminal_is_player_owned,
date_added, date_modified
```

### Terminal type breakdown (verified from `~/sc-data/uex_terminals.json`)

| type           | count |
| ---            | --- |
| item           | 479 |
| commodity      | 162 |
| fuel           | 98  |
| vehicle_rent   | 32  |
| commodity_raw  | 23  |
| refinery       | 21  |
| vehicle_buy    | 9   |
| **total**      | **824** |

### Why we keep UEX as the spine

- It's the **only source for live commodity prices, routes, and fuel** — no realistic plan B.
- The location graph (system → planet → moon → city → station → outpost) is exhaustive, well-normalized with proper FK ids, and consistently tagged with `is_available_live` so we can filter to the current patch.
- Every entity has a stable `id` and stable `slug` we can use for joins everywhere else.

### What we lose if UEX dies

- All prices (catastrophic — there is no Plan B for live commodity prices)
- The location graph spine (rebuildable from scunpacked + wiki, but expensive)
- Fuel and refinery yield data (no other public source)

---

# 2. Star Citizen Wiki API — `https://api.star-citizen.wiki/api/v3/`

**Lore + dimensions + combat + skus.** The single richest non-trade source. Free, public, no auth, very polite to scrape (250 ms between calls is more than enough). The wiki is community-maintained but it pulls a lot of its data from official RSI feeds and from datamining.

- **Base URL**: `https://api.star-citizen.wiki/api/v3/`
- **Legacy v2**: `https://api.star-citizen.wiki/api/v2/` — Pedro's `scraper.py` still uses v2 for items endpoints. Both versions are live; v3 is the one we should target for new code.
- **Auth**: none. The wiki accepts an optional API key (`Bearer …` in header) for higher rate limits and admin endpoints — not needed for reads.
- **Rate limit**: undocumented; the legacy fetcher sleeps 250 ms between pages and never gets throttled.
- **Pagination**: JSON:API style, `page[size]` and `page[number]`. `meta.last_page` tells you when to stop. Default page size 10, max ~50.
- **Docs / OpenAPI**: <https://docs.star-citizen.wiki/>
- **GitHub**: <https://github.com/StarCitizenWiki/API> (public source)
- **License**: CC BY-NC-SA (wiki content). Attribution required.
- **Status (2026-04-07)**: **OK** — verified `/vehicles?page[size]=2` returned `meta.total = 293`, `last_page = 147`.
- **Known issues**:
  - `description` field on vehicles is sometimes `[]` (empty array) instead of a string — guard.
  - The list endpoint **omits `weapon_snapshot`**. You need the per-slug detail endpoint (`/vehicles/{slug}`) for weapon counts.
  - Slug mismatch with UEX is rampant (~46 ships with no direct hit). The legacy `wiki.ts` fetcher had a hand-curated alias map (`expandUexCandidates`) — keep that file as a reference, the rules are real.
  - The v3 detail endpoint sometimes returns HTML instead of JSON for ambiguous slugs. Check `text.startsWith("{")` before `JSON.parse`.
  - Concept ships (kraken, galaxy, hull-b/d/e, orion, pioneer, …) are absent from the list endpoint but **do exist on the per-slug detail endpoint**. The legacy `wiki-detail.ts` `backfillMissingFromDetail` pass rescued ~24 ships this way.

## Endpoints

| Endpoint                                  | Returns | Notes |
| ---                                       | ---     | --- |
| `/vehicles?page[size]=50&page[number]=N`  | 293 spaceships paginated | walk pages 1..N where N = `meta.last_page` |
| `/vehicles/{slug}`                        | one vehicle, full payload incl. `weapon_snapshot`, `parts`, `turrets`, `cooling`, `power_pools` | call per slug, 250 ms sleep |
| `/items?filter[type]=…`                   | item catalogue, paginated | massive — see scrape strategy below |
| `/items/{uuid}`                           | one item, full payload | |
| `/manufacturers`                          | the 50ish in-game manufacturers | |
| `/galaxy/star-systems`                    | wiki-side star system list (overlaps UEX, wiki has lore) | |
| `/blueprints?page=…`                      | crafting blueprints, mirrors `sc-craft.tools` | Pedro's scraper used `https://api.star-citizen.wiki/blueprints?page=...` directly, not under `/api/v3` — verify the path before relying on it |
| `/comm-links?…`                           | RSI Comm-Link articles (lore drops, patch notes) | |

## Vehicle detail field list (verified from live `/vehicles?page[size]=2`, ship `Avenger Stalker`)

This is **vastly richer** than UEX. The wiki's vehicle row is the most complete public dataset for combat / engineering / signature data:

```
uuid, name, game_name, slug, class_name,
sizes:{length, beam, height},                   # canonical dims, replaces UEX's width/height/length
dimension:{length, width, height},              # same numbers, different shape
emission:{ir, em_idle, em_max},                 # IR/EM signatures
mass, mass_hull, mass_loadout, mass_total,
cargo_capacity,
cargo_grids:[{uuid, width, height, length, volume, scu, ...}],
vehicle_inventory,
inventory_containers:[{uuid, width, height, length, volume, scu, scu_c, ...}],
crew:{min, max, weapon, operation},
health,                                          # hull HP
shield_hp, shield_face_type,
shield:{hp, regeneration, face_type, max_reallocation, reconfiguration_cooldown, max_el…},
speed:{scm, max, boost_forward, boost_backward, zero_to_scm, zero_to_max, scm_t…},
afterburner:{pitch_boost_multiplier, roll_boost_multiplier, yaw_boost_multiplier, capacitor, idle_cost, …},
fuel:{capacity, intake_rate, usage:{main, retro, vtol, maneuvering}},
quantum:{quantum_speed, quantum_spool_time, quantum_fuel_capacity, quantum_range, port…},
agility:{pitch, yaw, roll, pitch_boosted, yaw_boosted, roll_boosted, acceleration:{…}},
armor:{uuid, health, signal_infrared, signal_electromagnetic, …},
manufacturer:{name, code, uuid, link, …},
size_class,                                      # 1..6
cross_section:{length, width, height},
cross_section_max,
is_vehicle, is_gravlev, is_spaceship,
signature:{ir_quantum, ir_shields, em_quantum, em_shields, em_groups_quantum:{Radar:..., …}},
cooling:{generation_segments, usage_shields_pct, usage_quantum_pct, used_segments_shields, used_segments_…},
power:{generation_segments, used_segments_shields, used_segments_quantum, used_segments_grouped:{Radar:…}},
power_pools:{Shield:{type, item_type, size}, WeaponGun:{…}, …},
penetration_multiplier:{fuse, components},
insurance:{claim_time, expedite_time, expedite_cost},
damage_limits:{before_destruction:[{HP, Name, DestructionDamage}, …]},
parts:[{name, display_name, damage_max, children:[…recursive…]}],   # full hitbox tree
turrets:{manned:[…], remote:[…], pdc:[…]},
career, role,
weapon_snapshot:{pilot_guns_count, turrets_manned_count, turrets_remote_count,
                 missile_rack_count, missile_count, countermeasures_count},   # detail endpoint only
loaner:[…], skus:[{title, price, available, imported_at}], msrp,
web_url, link, version,
production_status, production_note, description, type
```

### Why we want this source

- **Only public source** for: cargo grid layout, hitbox tree (`parts`), agility/acceleration breakdowns, signature decomposition, power/cooling segment usage, official insurance times.
- **MSRP and SKUs** — direct from RSI store import.
- **Official `manufacturer.link`** — gives us a clean path to manufacturer pages.

### What we lose if it dies

- Combat stats (HP, shield HP, regen) — can be partially rebuilt from erkul/scunpacked.
- Engineering details (cargo grids, turrets, parts tree) — only erkul/scunpacked overlap, less polished.
- Lore descriptions and the full SKU history — irreplaceable.
- The aliasing pain to UEX returns; without the wiki we can't enrich UEX vehicles at all.

---

# 3. RSI Ship Matrix — `https://robertsspaceindustries.com/ship-matrix/index?`

**The official catalog from Cloud Imperium.** Cloudflare-protected for browsers but `curl` from the Pi works fine — verified.

- **URL**: `https://robertsspaceindustries.com/ship-matrix/index?` (the trailing `?` is required, otherwise it returns 404)
- **Auth**: none, but Cloudflare looks at User-Agent. `curl` default UA (`curl/8.x`) gets through.
- **Rate limit**: undocumented. Don't hammer it; the matrix is small (~310 ships) and changes only on patch days.
- **Status (2026-04-07)**: **OK** — verified from the Pi, returned the full ship list as JSON inside `{"success":1,"code":"OK","msg":"OK","data":[...]}`.
- **Pi note**: works from the Pi over Tailscale. Same `curl` from a browser context (e.g. Headers like `Sec-Fetch-*` from Chrome) gets blocked. **Server-side fetch only.**

### Ship row field list (verified, ship `Aurora Mk I ES`)

```
id, name, focus, type, size, production_status, production_note,
manufacturer_id, chassis_id,
length, beam, height, mass,
cargocapacity,
min_crew, max_crew,
scm_speed, afterburner_speed,
pitch_max, yaw_max, roll_max,
xaxis_acceleration, yaxis_acceleration, zaxis_acceleration,
description, url,
time_modified,                                      # human string "2 weeks ago"
manufacturer:{
  id, code, name, description, known_for,
  media:[{id, derived_data:{sizes:{...}}, ...}]     # logo + brand assets
},
media:[{                                            # canonical RSI renders
  id,
  derived_data:{sizes:{
    "post-large":{url, width, height},
    "post-medium":{url, width, height},
    "store-small":{url, width, height},
    "subscribers-vault-large":{url, width, height},
    ...
  }},
  ...
}],
compiled:{
  Modular:{...},
  Loaners:[{id, name, url, …}],                    # ship loaner list (overlap with UEX `ids_vehicles_loaners`)
  ComponentClass:{
    "Propulsion":[{component_class, component_size, name, manufacturer, mounts, ...}],
    "Thrusters":[…],
    "Avionics":[…],
    "Weapons":[…]
  }
}
```

### Why we want this source

- **The only canonical, untouchable image source** that works in production browser contexts. UEX's `assets.uexcorp.space` 503s in browsers, the wiki's `web_url` returns wiki-rendered HTML pages — RSI's `media[].derived_data.sizes` is the only set of CDN URLs guaranteed to load client-side.
- **Default RSI loadout** in `compiled.ComponentClass` — useful as a sanity check for erkul.
- **Official store URL** (`/pledge/ships/...`) is normalized here.
- The data is the closest thing to an official "what CIG says about this ship" snapshot.

### What we lose if it dies

- High-quality canonical renders for the ships catalogue (only fall-back is the wiki's `web_url` page-scrape, which is messy).
- The "official RSI loadout" view that lets us flag mismatches between RSI and erkul.

---

# 4. erkul.games — `https://server.erkul.games/`

**The canonical loadout planner for the Star Citizen community.** It's an SPA with an unauthenticated API the dashboard polls. Pedro's `scraper.py` already documents the endpoints — they're stable.

- **Base URL**: `https://server.erkul.games/`
- **Required headers**: `Origin: https://www.erkul.games`, `Accept: application/json` (CORS enforcement — without `Origin` you get a generic CORS error, with it you get JSON).
- **Auth**: none for reads. The `/informations` endpoint returns a `sessionToken` JWT in its second array element — **needed only for write/save endpoints**, irrelevant for us.
- **Rate limit**: undocumented; Pedro's scraper sleeps 200 ms between calls and never gets throttled. Be polite, the maintainer is one person.
- **Status (2026-04-07)**: **OK**, verified.
  - `/informations` returned `liveVersion: "4.7.0-LIVE.11576750"`, `liveEntities: 2572`.
  - `/live/ships` returned **HTTP 200, 16,553,036 bytes** — the entire ship database in one shot.
- **License**: undocumented. Erkul is donation-funded; **don't republish raw data without crediting**, and don't burn their bandwidth — cache aggressively.
- **Local snapshot**: `~/sc-data/erkul_all.json` (20 MB) is a Pedro-side dump containing all categories. Use it as a fallback for offline work.

## Endpoints (from `~/sc-data/scraper.py:115-141`)

| Endpoint              | Payload size | Notes |
| ---                   | ---          | --- |
| `/informations`       | tiny         | live + ptu version, entity counts, **session JWT** |
| `/live/ships`         | 16.5 MB      | 208 ships with **full default loadouts and engineering data** |
| `/live/weapons`       | large        | 147 ship weapons |
| `/live/shields`       | medium       | 64 shields |
| `/live/coolers`       | medium       | 73 coolers |
| `/live/power-plants`  | medium       | 76 power plants |
| `/live/qdrives`       | medium       | 57 quantum drives |
| `/live/mining-lasers` | medium       | mining heads |
| `/live/modules`       | medium       | mining modules |
| `/live/missiles`      | medium       | missile data |
| `/live/utilities`     | medium       | misc components |
| `/ptu/...`            | parallel set | PTU patch — same shapes |

There are also `/live/items/{slug}` style endpoints discoverable by watching the network tab on the website; the broad `/live/<category>` pulls cover everything we need.

## Ship row shape (verified from `~/sc-data/erkul_all.json`)

Each top-level item is `{calculatorType, data, localName}`. The `data` object on a ship contains:

```
maxLifetimeHours, type, subType, size, grade, name, shortName, description,
health,                              # hull HP
ref,                                  # internal item reference
insurance:{...},
rnPowerPools,                         # raw network power pool config
loadout:[…],                          # default RSI/erkul loadout — array of mounts
vehicle:{...},                        # raw vehicle.xml-derived data, matches scunpacked
crossSection:{height, width, length},
items:[…],                            # every item in the loadout, expanded
hull:{...},                           # armor / damage data
shield:{...},                         # shield config
armor:{...},
ifcs:{...},                           # IFCS flight model coefficients
capacitor:{...},                      # power capacitor
cargo, fuelCapacity, qtFuelCapacity,
manufacturerData:{...}
```

`localName` is the Star Citizen internal class id (`aegs_avenger_stalker`, `vncl_lasercannon_s1`, …) — the **same key** scunpacked uses, so erkul ↔ scunpacked join cleanly on it.

### Why we want this source

- **Only public source for the parsed `loadout` array** — i.e. "what mount points does this ship have, what's plugged into each by default, and what are the engineering interactions." The wiki has component slots in `power_pools`, scunpacked has the raw XML, but erkul gives us the polished, gameplay-correct representation.
- **Same `localName` as scunpacked / unp4k** → trivial join key for FAQ-style cross-validation.
- The component endpoints (`/live/weapons`, `/live/shields`, …) are the cleanest version of the data — you don't need to write your own XML parser.
- It's where every Star Citizen pilot already goes for loadouts. If we surface "erkul loadouts inside our ship pages" we leverage existing trust.

### What we lose if it dies

- The "default loadout per ship" view (rebuildable from scunpacked but with significant work).
- The cleanly-parsed component stat blocks (cstone has the same data, less polished).
- The single best join key (`localName`) between SC component datasets.

---

# 5. Citizen Stone — `https://finder.cstone.space/`

**A community-made browser for the SC game database.** Endpoints are RPC-style (`/GetSWeapons`, `/GetCoolers`, `/GetLocation/<path>`). Pedro's scraper already harvests it. This is the only realistic source for **per-shop FPS inventories** (which UEX doesn't track in `items_prices` for many of the smaller stores).

- **Base URL**: `https://finder.cstone.space/`
- **Auth**: none.
- **Rate limit**: undocumented. Pedro sleeps 200 ms between component endpoints and 100 ms between shop fetches and never gets throttled. **601 shops** were fully scraped without issue.
- **Status (2026-04-07)**: **OK** — verified `/GetSWeapons` returned 146 ship weapons (108,895 bytes JSON).
- **License**: undocumented. Community project.
- **Local snapshot**: `~/sc-data/cstone_all.json` (4.5 MB), `~/sc-data/cstone_shops.json`, `~/sc-data/mining_heads_cstone.json`.

## Endpoints (verified from `~/sc-data/scraper.py:55-105`)

| Endpoint                  | Returns                          | Local row count |
| ---                       | ---                              | --- |
| `/GetSMinings`            | mining heads                     | 18 |
| `/GetSMMods`              | mining modules                   | 27 |
| `/GetFPSMMods`            | FPS mining tools                 | 6 |
| `/GetSWeapons`            | ship weapons                     | 146 |
| `/GetShields`             | shields                          | 65 |
| `/GetPowers`              | power plants                     | 76 |
| `/GetCoolers`             | coolers                          | 73 |
| `/GetDrives`              | quantum drives                   | 57 |
| `/GetMissiles`            | missiles                         | 65 |
| `/GetFPSWeapons`          | FPS weapons                      | 296 |
| `/GetGadgets`             | gadgets                          | 14 |
| `/GetFoods`               | foods                            | 126 |
| `/GetDrinks`              | drinks                           | 73 |
| `/GetFPSTools`            | FPS tools                        | 34 |
| `/GetFPSToolAttachments`  | FPS tool attachments             | 15 |
| `/GetHChips`              | hacking chips                    | 48 |
| `/GetFPSMags`             | FPS magazines                    | 44 |
| `/GetFPSAttachments`      | FPS attachments                  | 98 |
| `/GetContainers`          | cargo containers                 | 22 |
| `/GetLocation/<urlencoded path>` | shop inventory at that path | 601 paths, 23,985 items total |

## Component item shape (verified from `~/sc-data/cstone_all.json`, mining head row)

```
ItemId,                          # UUID, matches game
ItemCodeName,                    # game internal class name (e.g. "AEGS_Avenger_Stalker")
Tags, Sold, Name, Manu, Desc,
Size, Grade, Type,
Powerdraw,
LaserInstability,
OptimalChargeWindowSizeModifier,
ResistanceModifier,
ShatterdamageModifier,
ClusterFactorModifier,
OptimalChargeWindowRateModifier,
CatastrophicChargeWindowRateModifier,
InertMaterials,
MinLaserPower, ...
```

These fields **match the raw `vehicle.xml` attribute names** from the game files (the `ChargeRate`, `Powerdraw`, `OptimalChargeWindowSizeModifier` etc. are CryEngine-side names) — so cstone is essentially a thin wrapper around a scunpacked-style dump, exposed as REST.

## Shop inventory shape (verified, "Nyx - Levski - Refinery 03 - Supplies")

```json
{
  "ItemId": "1b6a6b76-f3fc-402c-a24a-204f2eeae6f7",
  "name": "APX Fire Extinguisher",
  "type": "Personal Weapons/Personal Weapons",
  "size": null,
  "price": 1000
}
```

`ItemId` is the same UUID as the wiki's item endpoint — clean join.

### Why we want this source

- **Only practical source for full FPS shop inventories** (601 shops × ~40 items each = ~24k entries). UEX's `items_prices` covers the major commerce terminals but skips a lot of the smaller stores cstone reaches.
- The component data uses the **raw CryEngine field names**, which is what we need if we ever want to do anything advanced like tooltip the literal modifier coefficient.
- It's CDN-light and has been stable — Pedro pulled all 601 shops in one run.

### What we lose if it dies

- ~80% of FPS gear pricing (UEX still has the major terminals).
- The "raw modifier" shape we'd need for engineering tooltips.
- 601 shops is dataset-grade information — there is no other public source that maps store layouts this densely.

---

# 6. sc-craft.tools — `https://sc-craft.tools/api/`

**The crafting blueprints database.** Same scrape pattern as cstone: REST, no auth, paginated. Pedro's scraper covers it (`scraper.py:151-173`).

- **Base URL**: `https://sc-craft.tools/api/`
- **Auth**: none.
- **Status**: not verified live this session (low priority — we have a fresh local dump). Pedro's scraper logs say it worked on 2026-04-07 18:03 with `version: LIVE-4.7.0-11518367`.
- **Local snapshot**: `~/sc-data/blueprints.json` (2.4 MB, 1040 blueprints)

## Endpoints

| Endpoint                                                      | Returns |
| ---                                                           | --- |
| `/api/config?`                                                | site config, gives `stats.version` (current patch version string) |
| `/api/blueprints?page=N&limit=50&search=&version=…&ownable=0` | paginated blueprint list (~1040 across ~21 pages) |

## Blueprint row shape (verified from `~/sc-data/blueprints.json[0]`)

```
id, blueprint_id, name, loc_key,
category,                  # "Weapons / Sniper", "Ships / Light Fighter", etc.
craft_time_seconds,
tiers,                     # int (1..N quality tier)
default_owned,
item_stats,                # dict of base stat values for the crafted item
version,                   # patch string e.g. "LIVE-4.7.0-11518367"
ingredients:[              # the recipe
  {
    slot,                  # "FRAME", "BARREL", etc.
    slot_loc_key,
    options:[{guid, name, quantity_scu, min_quality, unit, loc_key}, …],
    quality_effects:[
      {stat, stat_loc_key, quality_min, quality_max,
       modifier_at_min, modifier_at_max}, …
    ]
  }, …
],
missions                   # the missions that reward this blueprint
```

This is the **only structured source for the engineering recipes**: each ingredient slot, the options that can fill it, and the quality-curve modifiers (`modifier_at_min` / `modifier_at_max`) that govern how much each ingredient affects the final stats. Trying to reproduce this from raw game files would mean replicating the entire crafting tree.

### Why we want this source

- It's the **canonical "recipe shape"** for the new crafting system in 4.x.
- The 4-deep nesting (blueprint → ingredients → options → quality_effects) is the only way to build a "what stat does this ingredient give me?" UI.
- 1040 blueprints already on disk, refreshed twice this week — the local copy is current.

### What we lose if it dies

- The whole crafting page concept. There is no public alternative.

---

# 7. starcitizen.tools — `https://api.star-citizen.wiki/blueprints/...`

A **second** blueprint endpoint, hosted under the wiki's domain. Pedro's scraper hits both (`scraper.py:205`). They overlap heavily, but the wiki version sometimes has better lore strings and the sc-craft version sometimes has more recent stat curves. **Use sc-craft as primary, wiki as enrichment.**

---

# 8. scunpacked-data — `https://github.com/StarCitizenWiki/scunpacked-data`

**Datamined JSON dumps of `Data.p4k` contents, kept in sync with LIVE.** Promoted to **first-class source** after verification on 2026-04-07. Previously flagged as "low priority v1" in an earlier version of this doc — that framing was wrong. The repo is:

- **Very active.** Latest commit on `master` is `568d121a` dated **2026-04-03 15:35 UTC** (four days before this verification), commit message `"4.7.0-LIVE.11518367\n\nParse factions"`. Maintained by **H. C. Kruse (@octfx)** — the same author as the **ScDataDumper** successor tool. So scunpacked-data and ScDataDumper are the *same* pipeline from the *same* maintainer — one is the extraction code, the other is the output artifact. You don't need to pick: use the JSON dump.
- **Patch-tagged.** Every commit message is the full game version, e.g. `4.7.0-LIVE.11518367`. That gives us a **reliable "when does this data correspond to which patch"** stamp, which no other free source publishes this cleanly.
- **PGP-signed.** Commits are verified-signed by the maintainer's key — paranoia-grade chain of custody for "this JSON really came from the advertised game build."

- **Repo**: <https://github.com/StarCitizenWiki/scunpacked-data>
- **Default branch**: `master` (not `main` — the previous cloning example in the team notes that referenced `main` would 404).
- **Raw file prefix**: `https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master/<path>`
- **Successor / pipeline source**: <https://github.com/octfx/ScDataDumper> (the parser; same maintainer)
- **Original fork root**: <https://github.com/richardthombs/scunpacked> (the legacy C# unpacker, still referenced by ScDataDumper)
- **Auth**: none for read. GitHub API calls count against the 60/hr unauthenticated rate limit — use `curl` or a classic PAT in `GITHUB_TOKEN` env var if you iterate many files.
- **Pull strategy**: there are two shapes.
  - **Clone** (`git clone --depth 1 https://github.com/StarCitizenWiki/scunpacked-data.git ~/sc-data/scunpacked-data`). Full repo is ~100–200 MB on disk. Refresh with `git pull`.
  - **Raw file fetch** per commit — cheapest for scheduled ingest. Use `https://api.github.com/repos/StarCitizenWiki/scunpacked-data/commits/master` to get the latest SHA, then fetch each `raw.githubusercontent.com/...?ref={sha}` URL you care about. That way you never re-download unchanged files.
- **Update lag**: the maintainer commits on the same day as patches, typically. The `4.7.0-LIVE.11518367` commit was made on 2026-04-03 while the live build at the time of writing was also `4.7.0-LIVE.11576750` (per erkul's `/informations` endpoint), so scunpacked-data is **about 3 days behind live on 2026-04-07**. Acceptable for our use.
- **License**: per the repo. Consume the data under "community dataminer" terms — credit the maintainer, don't republish bulk, hotlink only if you must.
- **Status (2026-04-07)**: **OK** — verified `GET api.github.com/repos/StarCitizenWiki/scunpacked-data` returns `200` with full metadata; root contents listing enumerates the layout below; commits endpoint returns the latest signed build stamp.

## Top-level layout (verified from GitHub contents API)

```
blueprints.json           # 5.0 MB — full crafting DB (parallel to sc-craft.tools §6)
factions/                 # NEW 2026-04-03 — faction records parsed from Global.dcb
fps-items.json            # 45.2 MB — master FPS gear index (armor, clothing, helmets, medical, undersuits, ammo)
items/                    # per-item JSON (one file per UUID)
items.json                # master item index (thin)
labels.json               # in-game localized strings (English — the @item_… label mapping)
manufacturers.json
resource-types.json       # mineable resource classification (maps commodity slug → mineral chain)
ship-items.json           # ship-mounted components only (ship weapons, shields, power, QD, coolers, missiles)
ships/                    # per-ship JSON (one file per vehicle)
ships.json                # master ship index
starmap.json              # full parsed starmap (systems + planetary bodies + positions)
tags.json                 # CryEngine tag taxonomy used across items
.gitattributes
```

## Why this is now the foundation for ships/items — and why Gemini's "sc-data/sc-unpacked-data" hype was fake

An earlier Gemini dump (see `docs/_research/gemini-architecture.md` §3) insisted that `github.com/sc-data/sc-unpacked-data` was "**THE foundation, cleanest dump of Game.xml → JSON**" and should be the first-class source. **Verification on 2026-04-07 proved that was fabricated.** The following are all 404:

- `GET api.github.com/repos/sc-data/sc-unpacked-data` → **404 Not Found**
- `GET api.github.com/orgs/sc-data` → **404 Not Found**
- `GET api.github.com/users/sc-data` → **404 Not Found**

There is no `sc-data` org, user, or repo on GitHub. Gemini hallucinated the URL. The real, working, active equivalent is the one documented here: `StarCitizenWiki/scunpacked-data`, maintained by octfx. Treat it as the drop-in that Gemini was describing — its layout matches the "Game.xml as JSON" pitch, the commit cadence is per-patch, and the provenance chain is visible.

## Why we want this source

- **Ground truth for every component, ship, and crafting recipe** at a named patch version. UEX/wiki/erkul/cstone are all downstream of the same extraction but each one rewrites field names or drops data. The scunpacked dump is the closest thing to "what the game actually shipped."
- **Only free public source with a stable patch-version stamp in the commit message.** Lets us answer "what changed for the Avenger Stalker between 4.7.0-LIVE.11518367 and 4.7.1?" which is the whole pitch of Gemini's `change_log` table.
- **Unique coverage**: `labels.json` (localization), `factions/`, `tags.json`, `resource-types.json` are not exposed by any other source in our catalogue.
- Clean join key through `localName` / `ClassName` → matches erkul / cstone / the unp4k extraction trail.

## What we lose if it dies

- We fall back to unp4k on Pedro's Fedora gaming desktop — which is off limits per the Pi-only policy. Practically that means: if scunpacked-data goes silent, we freeze to whatever local snapshot we last pulled and wait for a community replacement.

---

# 9. unp4k — extracting `Data.p4k` from a local game install

**The nuclear option.** If every web source dies, we can extract the data ourselves from the user's SC install.

- **Tool**: <https://github.com/dolkensp/unp4k> (.NET, Windows-first but mono works on Linux for the core extractor; community fork at <https://github.com/camiicode/unp4k-for-starCitizen-data> works on Linux)
- **Python tool**: <https://pypi.org/project/scdatatools/> — a Python implementation that's friendlier to integrate with a server-side data pipeline.
- **Prerequisite**: a Star Citizen install. The `Data.p4k` file lives in `<SC install dir>/StarCitizen/LIVE/Data.p4k`. **Pedro doesn't run SC on the Pi**, so this would require a one-shot upload from his Fedora gaming desktop — explicitly NOT in the Pi-only policy. **Do not include in the live ingest pipeline.** Document only.
- **What's inside `Data.p4k`**: a Zip-format archive (STORE / DEFLATE / ZSTD modes, with bespoke encryption on some entries) containing CryEngine assets:
  - `*.cgf`, `*.cga` — CryEngine geometry (3D meshes, the only path to raw ship 3D models)
  - `*.dds` — textures
  - `*.xml` (often as **CryXML** — a serialized binary form, needs `unforge.exe` or `scdatatools` to convert to text XML)
  - `game.dcb` — a bespoke binary database that holds component / ship / loadout / mission tables
  - `Localization/` — all localized strings
  - `Libs/Config/` — controls, keybinds, FOV configs
- **Reference repos for extracted data shapes**: <https://github.com/Dymerz/StarCitizen-GameData> (XML→JSON converter), <https://github.com/StarCitizenWiki/scunpacked> (the parser that scunpacked uses).

## What unp4k uniquely gives us

- **3D models for the ship viewer.** Every other source gives us 2D images. If we want a Three.js ship inspector, the geometry has to come from `.cgf` → `.gltf` (community converters exist).
- **Ground-truth XML for any disagreement** between UEX / wiki / erkul / cstone.
- **Localized strings** — the only way to give the site multi-language support someday.

## Why this isn't in the ingest pipeline

- Requires Windows or a wine-compatible Linux desktop with a SC install. The Pi has neither.
- `Data.p4k` is ~100 GB. Even one-shot uploading it across Tailscale is painful.
- License grey area — extracted assets are CIG copyright. We can use them for our own data but probably **shouldn't host extracted geometry** publicly.

**Documented for reference, not for use this iteration.**

---

# 9a. RSI hidden/undocumented APIs — `https://robertsspaceindustries.com/api/…`

**The situation in 2026-04-07**: most of the "hidden RSI APIs" floating around in old blog posts and the Gemini dump are **dead**. CIG moved to a different backend between 2023 and 2026 and the subdomains + paths that worked back then now return 404, DNS-fail, or Cloudflare-block. The ship-matrix endpoint (§3) is the main exception — it's been stable for years. A second survivor, the **starmap API**, is documented here for the first time in this catalogue.

All endpoints below probed from the Pi on 2026-04-07.

## 9a.1 Starmap API — **ALIVE**

- **Base**: `https://robertsspaceindustries.com/api/starmap/`
- **Auth**: none. Server-side fetch only (same Cloudflare + UA rules as ship-matrix §3 — `curl` default UA is fine, real-browser `Sec-Fetch-*` headers get Cloudflared).
- **Rate limit**: undocumented. Treat like ship-matrix: a few requests per minute, cached.
- **Response envelope**: same `{"success":1,"code":"OK","msg":"OK","data":{…}}` wrapper RSI uses everywhere.
- **Status (2026-04-07)**: **OK**.

### Verified endpoints

| Endpoint                                  | Method | Response size (verified) | Returns |
| ---                                       | ---    | ---                      | --- |
| `/api/starmap/star-systems`               | POST   | 80,821 bytes             | `data.resultset` = 90 star systems with `id, code, name, description, position_x/y/z, status, type, affiliation[], aggregated_size/population/economy/danger, thumbnail{slug, source, images{post, product_thumb_large, subscribers_vault_thumbnail}}`. Verified systems present: Stanton, Pyro, Nyx, Terra, Castra, Nexus, etc. |
| `/api/starmap/star-systems/{CODE}`        | POST   | ~30,628 bytes            | Full system detail with body hierarchy (planets, moons, jumppoints). Verified on `STANTON`. |
| `/api/starmap/bootup`                     | POST   | 148,819 bytes            | The entire initial "boot" payload the web starmap loads — systems + affiliations + asset refs. Heavier; use per-system detail calls in production and only call `/bootup` once per boot. |

### Row shape — star-systems (truncated)

```json
{
  "id": 314, "code": "STANTON", "name": "Stanton",
  "description": "While the UEE still controls the rights to the system overall, …",
  "position_x": 49.534718, "position_y": -2.6339645, "position_z": 16.475292,
  "status": "P", "type": "SINGLE_STAR",
  "affiliation": [{"id":1,"code":"uee","color":"#48bbd4","name":"UEE","membership.id":843}],
  "aggregated_size": "4.85000000", "aggregated_population": 10,
  "aggregated_economy": 10, "aggregated_danger": 10,
  "thumbnail": {
    "slug": "anxi4tr0ija81",
    "source": "https://robertsspaceindustries.com/media/anxi4tr0ija81r/source/JStanton-Arccorp.jpg",
    "images": {
      "post": "https://robertsspaceindustries.com/media/anxi4tr0ija81r/post/JStanton-Arccorp.jpg",
      "product_thumb_large": "…",
      "subscribers_vault_thumbnail": "…"
    }
  }
}
```

### Why we want this source

- **Canonical RSI system coordinates** (x/y/z in the official map) that nobody else publishes cleanly. UEX has the star-system names and ids but not the positional geometry.
- **Official system thumbnails** for the map landing page. These load in browsers (CDN-backed, CORS-friendly).
- **Affiliation metadata** (UEE, Banu, Xi'an, UNC, …) as structured objects with official colour hex codes — saves us hand-maintaining a palette.

### What we lose if it dies

- The canonical coordinates and affiliation colours. Plan B: scunpacked-data `starmap.json` covers systems + bodies (no thumbnails), and UEX covers the location graph.

## 9a.2 The dead / fabricated endpoints (don't waste time here)

These are documented so that future agents and LLM-pasted suggestions don't waste effort re-verifying:

| Endpoint (Gemini/old docs)                                    | Status 2026-04-07 | Notes |
| ---                                                           | ---               | --- |
| `GET /api/investigation/v1/ship/{SHIP_ID}`                    | **❌ 404** | Gemini claimed this returns hardpoint x/y/z for Three.js weapon markers. **Fabricated or long-dead.** |
| `POST /api/galactapedia/getArticle`                           | **❌ 404** | Redirects to `/en/api/…` then 404. The user-facing `robertsspaceindustries.com/galactapedia` page still renders (200), but it's server-rendered HTML now — no public JSON API. |
| `POST /api/store/v2/products`                                 | **❌ 404** | "Real-money store prices + limited stock" endpoint Gemini referenced. 404 regardless of body shape. |
| `https://starmap.cloud.robertsspaceindustries.com/`           | **❌ DNS fail** | `curl: (6) Could not resolve host`. Subdomain retired. The replacement is `/api/starmap/*` on the main domain (§9a.1). |
| `/pledge/ships/{slug}/{Slug}` (old HTML scrape for HoloViewer)| **❌ 404** | RSI redirects to `/en/pledge/…` which returns a 404 page (with content `404 - Roberts Space Industries`). The ship marketing pages moved under a new router. Use ship-matrix JSON instead. |
| `robertsspaceindustries.com/media/{SHIP_ID}/source/ship.ctm`  | **❌ 404** | Verified on 3 real RSI media slugs (`b3nwvt5ye3zj0`, `tb6ui8j38wwscr`, `rktrsjyk8puxwr`, `19rekvyuhlvdkr`). Gemini's "Three.js .ctm pipeline" is **stale**. RSI appears to have removed or moved the `.ctm` CDN. If you want 3D ship geometry today, `maps.adi.sc` (§9b) ships `.glb` assets for a handful of capital ships; for the rest, `unp4k` (§9) is still the only path. |

**Lesson**: cross-check every "RSI hidden API" claim from an LLM against a live probe before citing it. Most of them are wrong.

---

# 9b. maps.adi.sc — `.glb` ship deck geometry (the closest thing to a Three.js-ready model pipeline)

**A React-Three-Fiber SPA that ships pre-baked `.glb` deck geometry for SC capital ships.** For a handful of the biggest ships in the game, this is the only public source of **Three.js-loadable 3D geometry** — every other "interior viewer" either uses 2D blueprints or requires running unp4k yourself.

- **Site**: <https://maps.adi.sc/>
- **Parent / publisher**: <https://adi.sc/> (ADI — "A Developing Idea", a long-running SC community tool site)
- **Auth**: none.
- **Rate limit**: none observed (static Vite asset serving). Be polite — one deck is 2–20 MB.
- **Status (2026-04-07)**: **OK**. Site HTML 200. Bundle JS 200. Spot-verified GLB: `https://maps.adi.sc/assets/carrack-Cfo2hSyn.glb` → 200.
- **License**: undocumented. It's a community viewer with a link to ADI's main site. **Don't republish the GLBs.** If we use them we hotlink (best, gives them bandwidth attribution) or we bake a local cache and **credit in UI**.

## Asset catalogue (extracted from the Vite bundle on 2026-04-07)

The SPA loads its ship geometry as Vite-fingerprinted static assets under `/assets/*.glb`. **111 `.glb` files** total, covering:

- **Whole-ship exteriors**: `carrack`, `caterpillar`, `hammerhead`, `hercules` (base), `idris`, `perseus`, `polaris`, `reclaimer`, `starfarer`, `starlancer`, and **890 Jump**
- **Per-deck interiors** (the most valuable — nothing else has this):
  - `carrack_deck_0` … `carrack_deck_4`
  - `hercules_a2_deck_0..1`, `hercules_c2_deck_0..1`, `hercules_m2_deck_0..1` (three A2/C2/M2 variants)
  - `idris_deck_0` … `idris_deck_5` (+ `idris_deck_3_m` for the medical variant)
  - `perseus_deck_0..2`
  - `polaris_deck_0..2`
  - `starlancer_max_deck_0..1`, `starlancer_tac_deck_0..1`
- **Props**: `fire_extinguisher`, `medical_pack`

Total: 8 capital-class ships + 1 medium multirole (Starlancer) with per-deck breakouts. No small or medium ships, no ground vehicles.

### Asset URL shape

```
https://maps.adi.sc/assets/{ship_slug}[_deck_{n}]-{vite_hash}.glb
```

The hash part changes on every rebuild of the site. **Don't hardcode the hash** — parse it out of the fresh bundle.

### How to list the current assets

1. `curl -sS https://maps.adi.sc/` → grep the bundle name from the `<script src="/assets/index-*.js">` line
2. `curl -sS https://maps.adi.sc/assets/index-<hash>.js` → regex-extract `"/assets/[^"]+\.glb"`
3. Diff against your local mirror

This is the same pattern as erkul / battlestations / sc-cargo — a Vite SPA bakes the asset manifest into the built JS. Because Vite regenerates hashes on every build, **the fetcher must re-read the bundle** on each refresh, not assume a fixed URL list.

## Why we want this source

- **Only public source** for Three.js-compatible geometry of Idris, Perseus, Polaris, Starlancer, Hercules (all variants), Carrack and their decks. The MOCKUP.md "3D ship inspector" feature is otherwise bottlenecked on unp4k (requires a local SC install, out of scope per Pi-only policy).
- Decks are split so we can load them progressively — perfect for a "cutaway deck selector" UI.
- Everything is hosted on a CDN-style static endpoint, no auth, no rate dance.

## What we lose if it dies

- Deck-level interior geometry for capital ships. **No fallback.** If we commit to a 3D deck viewer, we must mirror these `.glb` files locally the moment we start using them.

## Gotchas

- **Vite hashes rotate** — implement the "re-read bundle" loop above, not a static URL list.
- **Only capital ships covered** — no Aurora, no Avenger, no Cutlass, no ground vehicles. Don't promise universal 3D coverage based on this source.
- **License silence** — ADI has not published terms. Treat as "courtesy hotlink + visible credit in UI" until someone asks otherwise.

---

# 10. starcitizen-api.com — `https://starcitizen-api.com/`

A **third-party aggregator** that wraps RSI website data and `Data.p4k` extraction into a single REST API.

- **Auth**: API key required. Free tier = **1000 requests/day in live mode**, unlimited in cache mode (cache refresh runs daily).
- **Docs**: <https://starcitizen-api.com/api.php>
- **What it exposes**: ships from RSI, organizations, users, p4k-extracted catalogue.
- **License**: per the site.
- **Verdict**: **NOT WORTH ADDING.** Everything it exposes we already get for free with no key from RSI ship-matrix + scunpacked. The 1000/day cap makes it unworkable as a primary source. **Skip unless we need org/user info someday.**

---

# 11. spviewer.eu

A **stale** community ship viewer / loadout planner. Last meaningful update was years ago. **Skip** — superseded entirely by erkul.games.

---

# 12. starcitizen.tools (the wiki itself) — `https://starcitizen.tools/`

The actual wiki front-end, MediaWiki-based. We don't scrape HTML — we use the JSON API at `api.star-citizen.wiki` (section 2). Listed here as a reference because UEX rows include `wiki:` URLs that point at this domain (`https://starcitizen.tools/Pyro_system`).

**Use it as a "click-through to lore" link from the universe map.** Don't scrape.

---

# 13. RSI Comm-Link

The official RSI announcements feed. Exposed by SC Wiki API as `/api/v3/comm-links`. Useful only for the patch notes / news strip on the homepage. Low priority.

---

# 14. scattered GitHub data dumps (worth knowing, low priority)

- **<https://github.com/StarCitizenWiki/API>** — the wiki's own scraper source. Useful as a reference for what fields exist where.
- **<https://github.com/Dymerz/StarCitizen-GameData>** — Python tool to convert SC XMLs to JSON / SQL. Not a data source; a code source we can copy parsing logic from.
- **<https://github.com/Copeman-1/StarCitizen-Hangar-Data>** — hand-maintained hangar inventory dataset, useful for "all ships ever sold" history.
- **<https://github.com/GlebYaltchik/sc-keybind-extract>** — keybind dumper, only relevant if we ever want a "keybind reference" page.

---

# 14b. Niche community tools harvested from the Garden [GRDN] Discord dump

The sources in this section come from a 2021–2026 community "tools channel" dump pasted by Pedro into `docs/_research/garden-discord-tools-2021-2026.md` on 2026-04-07. Each one was cross-checked against `SOURCES.md` and `seed-sources.md` and only added here if it was genuinely new. All status checks from the Pi on 2026-04-07.

None of these are "first-class spine" sources — they cover edge cases (station pad charts, mining signals, interior geometry) that the big five (UEX / Wiki / RSI / erkul / cstone / scunpacked) don't. Use them as enrichment layers for specific features, not as canonical feeds.

## 14b.1 Regolith — `https://regolith.rocks/` + `https://api.regolith.rocks/`

The reference mining tool for SC — mining loadouts, calculators, workorder tracking, session tracking. Pedro listed it in `seed-sources.md` but it wasn't previously documented here.

- **Public site**: <https://regolith.rocks/> — **OK** (HTTP 200).
- **API host**: `https://api.regolith.rocks/` — AWS API Gateway fronted.
- **Status (2026-04-07)**: **⚠️ reachable but locked behind auth.** A bare `curl https://api.regolith.rocks/` returns HTTP 403 with `{"message": "Missing Authentication Token"}` — the stock AWS API Gateway challenge. `GET /prod/ships` also returns 403. This means **there is no unauthenticated public read path**: the site talks to its backend over a signed / key'd request we haven't reverse-engineered, and probably shouldn't without asking the maintainer.
- **Auth**: the SPA uses AWS Cognito + IAM. Rockbreaker (§14b.5) bundles `api.regolith.rocks` hardcoded, which suggests there may be a public read slice for its mining database reachable from that site — worth a focused F12 sniff on a real browser later.
- **License**: per the site. Community-maintained.
- **Verdict**: **don't ingest for v1.** Link out to it from the mining pages. Revisit later if Pedro wants a mining-signals-to-route integration and is ready to DM the Regolith dev to request API access.

## 14b.2 SC Mining Resource Signal Google Sheet — `docs.google.com/spreadsheets/d/1n4qqOfwbtsOubUTMWJ532pBGoFbx567S/`

Community-maintained lookup table of the 4.7 mining rock signature→yield mapping — the thing every miner wants in a sortable table after CIG's scanning rework.

- **Canonical viewer**: <https://docs.google.com/spreadsheets/d/1n4qqOfwbtsOubUTMWJ532pBGoFbx567S/edit?gid=943032706#gid=943032706>
- **CSV export** (works on the Pi headlessly, no Google auth needed): `https://docs.google.com/spreadsheets/d/1n4qqOfwbtsOubUTMWJ532pBGoFbx567S/export?format=csv&gid=943032706` — **OK** (verified, 1,334 bytes, 307→302 redirect chain followed by curl). Google serves the CSV as `text/csv` with a fresh cache key each time.
- **Verified schema** (first rows of the live CSV):

  ```
  RockName,Rarity,1,2,3,4,5,6
  Quantainium,Legendary,3170,6340,9510,12680,15850,19020
  Stileron,Legendary,3185,6370,9555,12740,15925,19110
  Savrilium,Legendary,3200,6400,9600,12800,16000,19200
  Ouratite,Epic,3370,6740,10110,13480,16850,20220
  …
  ```

  Columns `1..6` are the mining signal strength thresholds per rock count — what you need to cross-reference a scanner reading against "what's actually inside that rock."

- **Auth**: public view-only sheet. CSV export works anonymously.
- **Rate limit**: Google's public sheet rate limit. A few req/min is fine. Cache aggressively.
- **License**: community contribution, the author (Chameleon_69) posted it to RSI Community Hub and Reddit with open-sharing intent. Credit in UI if we use it.
- **Status (2026-04-07)**: **OK**.
- **Ingest strategy**: pull once a patch into `~/sc-data/mining-signals-{patch}.csv`, parse to JSON, surface in the mining page as a lookup table. Trivial.
- **Warning**: Google Sheets has no webhook. If the author updates the sheet silently, we won't know. Schedule a weekly re-pull and `diff` to detect changes.

## 14b.3 deltaconsultingsc.com — station pad charts (Squarespace-hosted image assets)

EFB-style (Electronic Flight Bag) charts showing landing pad layouts and sunrise/sunset times for every major space station in Stanton and Pyro. **There is no other public source for pad-level station maps.**

- **Canonical URLs**:
  - Index (per station): <https://www.deltaconsultingsc.com/chart-viewer-by-space-station>
  - Per landing zone: <https://www.deltaconsultingsc.com/chart-viewer-by-major-landing-zone>
  - Pyro: <https://www.deltaconsultingsc.com/pyro-chart-viewer>
  - CDF (Cargo Deck Facility? undocumented acronym): <https://www.deltaconsultingsc.com/cdf-chart-viewer>
  - Example station page: <https://www.deltaconsultingsc.com/seraphim-station>
- **Auth**: none.
- **Hosting**: the site is Squarespace. The charts are served as **JPG/PNG assets** from `images.squarespace-cdn.com/content/v1/5c5285667c93275c2645bd0d/…`. Example verified:
  - `https://images.squarespace-cdn.com/content/v1/5c5285667c93275c2645bd0d/b86b1753-9f55-4062-83cd-7109cd2b3da2/Crusader_Seraphim+Station.jpg` (and the standard Squarespace `?format={size}w` responsive variants).
- **Status (2026-04-07)**: **OK** — `/aviation-products`, `/chart-viewer-by-space-station`, `/seraphim-station` all returned HTTP 200.
- **Response shape**: **there is no structured data API**. The charts are **raster images only** (JPG/PNG). Whatever structured information they encode (pad positions, sunrise/sunset times) is **inside the pixels** — either hand-transcribe it for a handful of stations or OCR it. Neither is trivial.
- **License**: implicit community-share, but Delta Consulting is a semi-organized group. Before republishing, ask them.
- **Verdict**: **defer.** Link out from station pages. If Pedro ever wants a "dock at this pad" minimap feature, hand-transcribe the 4-8 most common stations (NB Aeroview, Baijini, Seraphim, Port Tressler, Port Olisar…) into a JSON we own — 20 minutes of manual data entry, far faster than an OCR pipeline.

## 14b.4 armory.thespacecoder.space — FPS gear database + its backing API `armory-api.quartermaster.thespacecoder.space`

An FPS gear viewer by the same author as Hauler (already in `seed-sources.md`). Unlike cstone's component-centric view, Armory is loadout-planner shaped: weapons, ammo, magazines, armors, attachments, loadout save/share, crowd-sourced loot-probability tracking.

- **Frontend**: <https://armory.thespacecoder.space/> — **OK** (200, React SPA).
- **Backend API base**: `https://armory-api.quartermaster.thespacecoder.space/`
- **Auth**: **token-gated.** A bare `GET /weapons` returns HTTP **401 Unauthorized**. The site evidently signs requests with a token the frontend holds; we'd need to look at how it authenticates before we can hit it headlessly.
- **Endpoints discovered in the bundled JS** (not verified live because of the 401 wall):

  ```
  GET  /weapons                            # ship the FPS weapon DB
  GET  /weapons/options                    # filter facets
  GET  /armors                             # armor pieces
  GET  /armors/options
  GET  /ammunitions
  GET  /attachments
  GET  /magazines
  GET  /consumables
  GET  /consumables/options
  GET  /loadouts                           # saved loadouts
  POST /loadouts                           # save a loadout
  POST /loadouts/claim
  POST /loadouts/update
  GET  /prices                             # current pricing the author tracks
  GET  /shops                              # shop index
  GET  /loot/probabilities                 # crowd-sourced drop rates — UNIQUE, nobody else has this
  GET  /loot/reports
  POST /submit/price                       # user price report (auth-protected)
  POST /submit/loot                        # user loot report
  POST /submit/loot/containers
  POST /submit/loot/locations
  POST /submit/image                       # Cloudinary upload
  GET  /options/all
  GET  /options/usables
  GET  /reporters/leaderboard
  ```

- **Uniquely interesting**: `/loot/probabilities` and `/loot/reports` are **crowd-sourced drop-rate data** — the exact "loot table" Gemini breathlessly said was impossible to get publicly (`docs/_research/gemini-architecture.md` §8, "Le truc lourd"). Armory has it, behind auth. If we want it, **DM the author** (same person as Hauler, Pedro probably already follows them).
- **Status (2026-04-07)**: **⚠️ reachable but auth-locked.** Site loads; backend returns 401.
- **License**: undocumented. Same author as Hauler — low risk, but contact before ingesting.
- **Verdict**: **don't ingest until we've DM'd the author and confirmed we're welcome.** Meanwhile, link out. If they say yes, this immediately covers (a) FPS gear db, (b) shop pricing, and (c) loot probabilities — three rows in the matrix that otherwise require stitching cstone + scunpacked + hand-built estimates.

## 14b.5 rockbreaker.peacefroggaming.com — mining rock-break calculator

Calculator that tells you whether your mining laser loadout can break a rock of given mass/resistance. Bundled as a React-Three-Fiber SPA. **Useful less for its data than for revealing that the author wires up to Regolith + starcitizen-api.com** — interesting architectural precedent.

- **Site**: <https://rockbreaker.peacefroggaming.com/> — **OK** (200).
- **Backend dependencies** (extracted from the bundle):
  - `https://api.regolith.rocks` — same 401 wall as §14b.1
  - `https://jodvkpcktaypitpetsuo.supabase.co` — Supabase project, user auth / state persistence
  - `https://api.starcitizen-api.com/u8DE7TdFWCFSAEhDHW4ZRvD5uNJlwE2G/v1/live/stats` — uses the paid `starcitizen-api.com` aggregator with a hardcoded key. **Do not reuse that key** (it's the author's personal quota); it's fine as a data-point that `starcitizen-api.com` has a `/live/stats` endpoint we could sign up for if we ever needed it.
- **Data shape**: the mining rock database is bundled into the Vite JS (`assets/index-C7iAP_Kk.js`, ~566 KB). No external JSON file.
- **Auth**: none for the calculator UI itself.
- **Status (2026-04-07)**: **OK** for the site, **⚠️** for the Regolith backend it consumes.
- **License**: kofi-funded, no explicit license statement.
- **Verdict**: **not a direct data source.** Its value is (a) knowing `api.starcitizen-api.com/v1/live/stats` is a real, queryable endpoint and (b) seeing how a community tool composes Regolith + supabase + starcitizen-api.com. Link out.

## 14b.6 sc-cargo.space — cargo grid viewer

Another cargo-grid planning tool by `bjax` (contactable in the Garden discord per the tools-channel dump).

- **Site**: <https://sc-cargo.space/> — **OK** (200).
- **Stack**: React-Three-Fiber SPA, ~1.88 MB bundle.
- **Backend / data fetches**: **none.** The bundle contains zero external URLs pointing at JSON/API endpoints beyond GitHub (dependency repos), MUI/React/Three.js origins, and a Reddit link to the author. **Cargo data is baked into the bundle.**
- **Auth**: none.
- **Status (2026-04-07)**: **OK**.
- **License**: undocumented.
- **Verdict**: **not a data source**, it's a UI reference. If we ever build a cargo grid visualiser, inspect its bundle for the grid-layout data model; otherwise link out.

## 14b.7 battlestations.osiris-devworks.com — ship role assignment tool

Assigns crew members to stations on a ship for group play — turrets, helm, engineering, weapons operator, etc.

- **Site**: <https://battlestations.osiris-devworks.com/> — **OK** (200, React SPA).
- **Stack**: Vite bundle, ~925 KB. Ship data is baked in as `src/data/ships/{slug}-default.json` references — **110 ship JSON entries** (Avenger Stalker → Javelin → Apollo Medivac → Asgard, etc.). The Vite build inlines these at compile time; the `/src/data/ships/*` paths **are not servable directly** (tested: they return the SPA fallback HTML).
- **Backend**: **none public.** The dev's plan per the Discord dump (Tyrus Wrecks, 2026-03-23): once a personal milestone is hit, the author will expose an API for inter-op with SCorgTools. **Not available today.**
- **Auth**: n/a (no backend).
- **Status (2026-04-07)**: **OK** (site) / **⚠️ API pending** (no public backend yet).
- **License**: undocumented.
- **Verdict**: **watch, don't ingest.** If the API lands, the 110 per-ship station layouts would be a useful overlay on our ship pages ("here's where the turret operators sit, here's the helm"). Pedro should follow the dev on Discord and we re-check in a patch cycle.

## 14b.8 Cornerstone Halo Belt route planner — `cstone.space/resources/knowledge-base/36`

A **separate** cstone.space tool from the `finder.cstone.space` universal item finder documented in §5. This one is the Aaron Halo asteroid belt travel-route reference — routes through the asteroid belt that Aaron Halo Mining Co. compiled, with density charts and mobiGlas-style maps.

- **URL**: <https://cstone.space/resources/knowledge-base/36> — **OK** (200, ~381 KB HTML).
- **Stack**: Joomla-hosted knowledge base article. **Not a structured data source** — it's a long-form article with embedded images (density charts, travel-route diagrams labelled "Aaron Halo Density Chart3", "Aaron Halo Travel Routes", "Refinery to Aaron Halo Mining Routes (3.14.0-LIVE-Rel2)") and mobiGlas-style map screenshots.
- **Auth**: none.
- **Status (2026-04-07)**: **OK**.
- **License**: community article, credit the author (CaptSheppard).
- **Verdict**: **not a data source**, link out. If we ever want a "mining in the Halo" section, hotlink the article and the chart images, but don't try to machine-read the route diagrams — they're pixel maps.
- **Warning**: note the `3.14.0-LIVE-Rel2` tag on the routes — it's an **old patch** (current is 4.7). The route geometry is probably still valid but some labelled waypoints may have moved. Verify before showing to users as "current."

## 14b.9 Cargo Grid Reference Guide — RSI Community Hub post

Community-made isometric cargo-grid PNGs for every flyable/drivable vehicle — the successor to the old "Ship Cargo Grid Reference Sheets."

- **URL**: <https://robertsspaceindustries.com/community-hub/post/cargo-grid-reference-guide-vqkv5cQI8ZCLC>
- **Author**: (unknown from URL slug). Posted via the RSI Community Hub.
- **Status (2026-04-07)**: **OK** — HTTP 200, ~193 KB HTML.
- **Response shape**: RSI community-hub HTML with embedded PNG images hosted on `cdn.robertsspaceindustries.com` and `media.robertsspaceindustries.com`. **Not structured data.**
- **Auth**: none for reads.
- **License**: RSI Community Hub TOS + the uploader's intent (the post is explicitly a "reference guide" for everyone).
- **Verdict**: **image asset source for a per-ship cargo-grid widget.** If we render cargo-grid visualisations on ship pages, one path is to iframe or hotlink the isometric PNGs from this post. The **better** path is to compute our own cargo grid from `Vehicle.cargo_grids` in SC Wiki v3 — the wiki already has the grid dimensions (`{width, height, length, scu}` per sub-grid) and we can build a deterministic isometric renderer in Three.js matching our site's style.
- **Risk**: a community-hub post can be deleted by the author or moderated by CIG. **Do not deep-link individual images**; snapshot the page once if we decide to depend on it.

## 14b.10 Buzz Killer HOTAS/HOSAS joystick binding packs — **OUT OF SCOPE**

Pre-configured HOTAS / HOSAS binding files (Dropbox + a Twitter account, `BuzZz_Killer` — linked from the Garden Discord dump on 2022-09-10). Binding files for VKB, Virpil, and T16000M setups.

- **Status**: out of scope for the data DB.
- **Why documented**: if Pedro later wants a "keybinds reference" feature (similar to how `github.com/GlebYaltchik/sc-keybind-extract` is referenced in §14), Buzz Killer's files are community-trusted starting points for HOTAS setups. Not a real-time data source — static pinned files on Dropbox.
- **Do not ingest.** One-line mention here so future agents don't re-propose it.

## 14b.11 VerseGuide, SnarePlan, SCMDB, SPViewer, FleetYards — explicit scoping notes

Pedro listed these in `seed-sources.md` and Gemini name-dropped several of them, but they **do not yet have dedicated sections** in this doc. Two-line scoping notes so future agents know where they stand:

- **SCMDB** (<https://scmdb.net/>) — mission database, the ground truth for "where do these crafting blueprints drop." **Not yet verified alive from the Pi in this session.** If Pedro commits to a crafting-discovery page, this is the first source to deep-profile; for now treat it as "planned work, not yet documented."
- **SPViewer** (<https://www.spviewer.eu/>) — §11 of this doc already marks it stale. Pedro's `seed-sources.md` listed it as "re-evaluate freshness" but nobody has found recent updates. **Leave as stale** until somebody spots a sign of life.
- **FleetYards** (<https://fleetyards.net/api/v1/docs/>) — documented public API, covers ships + specs + prices. Overlaps heavily with RSI ship-matrix (§3) + SC Wiki v3 (§2) but has better-normalised component endpoints. **Add only if we hit a gap** the big three don't cover; otherwise skip — our spine already has this data.
- **VerseGuide** (<https://verseguide.com/>) — community triangulation coordinates for caves, wrecks, Jumptown. **Not yet probed.** If we add a "hidden POI" layer to the map feature someday, profile then.
- **SnarePlan** (<https://snareplan.dolus.eu/>) — quantum interdiction calculator. Useful for pirates, but not data the site needs to expose.
- **Citizen History** (<https://citizen-history.com/>) — lore timeline. Out of scope for an economy + ship tool site; link out from the "lore" section if we build one.
- **VerseTime** (`github.com/dydrmr/VerseTime`) — Gemini mentioned this. Community script that auto-builds a lore timeline from RSI Comm-Links. Already covered indirectly by the SC Wiki `/comm-links` endpoint (§2) — no need to add a dedicated section.
- **Starship42** (<https://www.starship42.com/>) — documented in `docs/MOCKUP.md` as the inspirational source for the 3D fleet viewer. Not a data source, it's a UX reference.
- **CCU Game** (<https://ccugame.app/>) and **Hangar Link** (<https://hangar.link/>) — pledge-metagame tools. Out of scope (per Pedro's own `seed-sources.md` note on CCU Game).

---

# 15. Local data on disk — `~/sc-data/`

**The pre-existing scrapes Pedro already has.** This is the most important non-API source: it lets us bring up pages instantly without re-fetching.

| File                          | Size   | Type / shape | What's in it |
| ---                           | ---    | ---          | --- |
| `sc.db`                       | 6.5 MB | SQLite, 26 tables | The legacy scrape database — see table breakdown below |
| `uex_all.json`                | 60 KB  | dict — keys: commodities, terminals, vehicles, star_systems, planets, moons, space_stations, outposts, cities, companies, categories, refineries_methods, vehicle_rentals, vehicle_purchases, commodity_prices | A small index dump from UEX (hand-curated extract, not the full snapshot) |
| `uex_commodities.json`        | 110 KB | list, 191 items | Full `/commodities` response |
| `uex_commodity_prices.json`   | 6.0 MB | list  | Full `/commodities_prices` snapshot — **the most expensive thing to refetch**, valuable cache |
| `uex_item_prices.json`        | 820 KB | list, 590 items | A subset of `/items_prices` (Pedro filtered) |
| `uex_terminals.json`          | 1.1 MB | list, 824 terminals | Full `/terminals` response — see type breakdown in §1 |
| `uex_mining.json`             | 30 KB  | dict — heads, modules, gadgets | Mining gear pulled from UEX |
| `wiki_blueprints.json`        | 2 B    | empty list `[]` | Failed scrape, can be deleted |
| `wiki_mining.json`            | **215 MB** | list of 59,391 items | **NOT mining-only** — this is the full `/api/v2/items` dump including FPS gear, paints, doors, displays, etc. **Misnamed**; treat as `wiki_items_full.json`. Each row has uuid, classification, type, manufacturer, dimension, tags, shops, uex_prices, variants, web_url |
| `cstone_all.json`             | 4.5 MB | dict — 19 component categories + `shops` (601 entries) | Full Citizen Stone scrape |
| `cstone_shops.json`           | 56 KB  | dict — 9 hand-picked shops | Subset of cstone_all['shops'] |
| `mining_heads_cstone.json`    | 24 KB  | list of 18 | Mining heads in raw CryXML field names |
| `blueprints.json`             | 2.4 MB | list of 1040 | Full sc-craft.tools blueprint dump (version `LIVE-4.7.0-11518367`) |
| `all_shop_paths.json`         | 65 KB  | list of 601 entries | The 601 shop paths cstone exposes — used to drive the per-shop scrape loop |
| `erkul_all.json`              | 20 MB  | dict — info, ships(208), weapons(147), shields(64), coolers(73), power_plants(76), qdrives(57), mining_lasers, modules, missiles, utilities | The full erkul snapshot, version `4.7.0-LIVE.11518367` |
| `scraper.py`                  | 33 KB  | Python | The orchestrator. **Read this for the canonical list of sources.** |
| `extract_loadouts.py`         | 9 KB   | Python | Walks `erkul_all.json[ships]` and writes flattened rows into `sc.db.ship_loadouts` |
| `server.py`                   | 19 KB  | Python | A Flask debug server (not production) |
| `scraper.log`, `scraper_full.log` | small | text | Scrape run logs from 2026-04-06 / 04-07 |

## sc.db — table inventory

Verified from `sqlite3 ~/sc-data/sc.db "SELECT name FROM sqlite_master WHERE type='table'"` and row counts:

| Table                  | Rows  | Status / source | Notes |
| ---                    | ---   | --- | --- |
| `ships`                | **0** | EMPTY (broken) | Schema exists (id, name, manufacturer, scu, crew, mass, is_*) but never populated. The scraper apparently failed this insert — re-derive from erkul_all.json or UEX. |
| `ship_loadouts`        | 2,013 | erkul (via extract_loadouts.py) | (id, ship_name, slot_category, component_name, component_type, size). The flattened default-loadout view per ship. |
| `ship_weapons`         | 146   | cstone | (name, manufacturer, size, grade, type, fire_rate, alpha_dmg, dps, ammo_speed, fire_range, description) |
| `shields`              | 65    | cstone | (size, grade, max_shield, regen, downed_delay) |
| `power_plants`         | 76    | cstone | (size, grade, power_gen) |
| `coolers`              | 73    | cstone | (size, grade, cooling_rate) |
| `quantum_drives`       | 57    | cstone | (size, grade, drive_speed, spool_time, fuel_rate, jump_range) |
| `mining_heads`         | 18    | cstone | full mining head fields |
| `mining_modules`       | 27    | cstone | full mining module fields |
| `mining_gadgets`       | 30    | wiki  | mining gadget rows |
| `fps_weapons`          | 296   | cstone | (fire_rate, dps, mag_capacity) |
| `fps_items`            | 452   | wiki  | (manufacturer, category, type) |
| `blueprints`           | 1,040 | sc-craft.tools | (blueprint_id, name, category, craft_time_seconds, default_owned, version) |
| `blueprint_ingredients`| 2,701 | sc-craft.tools | (blueprint_id, slot, resource_name, quantity_scu, min_quality, unit) |
| `blueprint_rewards`    | 0     | EMPTY | mission rewards — never populated |
| `crafting_resources`   | 30    | sc-craft.tools | (name UNIQUE, total_blueprints_using, total_quantity_needed) |
| `commodities`          | **0** | EMPTY | schema exists, never written. Use `~/sc-data/uex_commodities.json` or fetch fresh. |
| `commodity_prices`     | **0** | EMPTY | use `~/sc-data/uex_commodity_prices.json` |
| `terminals`            | **0** | EMPTY | use `~/sc-data/uex_terminals.json` |
| `vehicle_purchases`    | 0     | EMPTY | UEX endpoint is fast, refetch live |
| `vehicle_rentals`      | 0     | EMPTY | same |
| `item_prices`          | 0     | EMPTY | same |
| `refinery_methods`     | 0     | EMPTY | same |
| `locations`            | 169   | UEX (cached) | (type, name, star_system, parent) — flat hierarchy |
| `shops`                | **23,985** | cstone | (location, item_name, price, item_type) — **the gem of the database** |

**Key takeaway**: sc.db is half-populated. The component / loadout / blueprint / shop tables are gold. The `ships`, `commodities`, `commodity_prices`, `terminals` tables are empty and **must be refilled from the JSON snapshots or live UEX**. INGESTION.md should treat this as a starting point we ETL into the new Drizzle schema, not a destination we query directly.

---

# Risk register

Sorted by **impact-if-it-dies × likelihood-of-dying**.

| Source              | Likelihood   | Impact  | Plan B |
| ---                 | ---          | ---     | --- |
| **UEX 2.0**         | Low (active, paid hosting) | **CATASTROPHIC** — no live prices | Snapshot once a day to disk; degrade gracefully to "last known" prices. There is no plan B for live data. |
| **SC Wiki v3**      | Low (community-funded) | High — lose all enrichment | scunpacked-data git mirror (§8) covers ~70% of fields. Cache locally. |
| **erkul.games**     | Medium (one-person project) | High — lose loadout planner | Local `erkul_all.json` snapshot is the fallback; refresh weekly while it's alive. cstone covers components but not parsed loadouts. |
| **finder.cstone.space** | Medium | Medium — lose 80% of FPS shop pricing and the polished components view | Local snapshot; UEX `items_prices` covers the major terminals. |
| **sc-craft.tools**  | Medium | Medium — lose crafting page entirely | Local snapshot; **scunpacked-data `blueprints.json` (5 MB)** is a second-source fallback. |
| **RSI ship-matrix** | Low (official) | Medium — lose canonical browser-side images | SC Wiki `media[]` URLs as fallback (lower quality). |
| **RSI starmap API (§9a.1)** | Low (official, same Cloudflare surface as ship-matrix) | Medium — lose canonical system coordinates + affiliation palette | scunpacked-data `starmap.json` covers systems + bodies without thumbnails; UEX covers the name graph. Plan B is multi-deep. |
| **scunpacked-data (§8)** | Low — actively maintained by octfx (verified 2026-04-03 commit) | **High** — it's the only datamined ground truth and the only source with patch-tagged commits | Run `unp4k` ourselves on Pedro's Fedora desktop (out-of-policy → we'd freeze to last local snapshot instead). |
| **maps.adi.sc (§9b)** | **Medium-high** (one-person SPA, undocumented license) | Medium for the 3D inspector feature — no other source has `.glb` deck geometry | Mirror the `.glb` files locally as soon as we use them; crediting ADI in the UI. If lost, deck viewer becomes unp4k-only (effectively dead on the Pi). |
| **regolith.rocks API (§14b.1)** | — (auth-locked, never ingested) | None to us today; unlocked it'd be Medium | Contact the maintainer before depending on it. |
| **armory-api.quartermaster.thespacecoder.space (§14b.4)** | — (auth-locked, never ingested) | None today; if unlocked, **unique source for FPS loot probabilities** — that's the "Gemini truc lourd" | DM the author (same person as Hauler). |
| **SC 4.7 Mineable Resource Signal sheet (§14b.2)** | Medium (Google Sheet, author can revoke sharing) | Low — a handful of rows we can snapshot in one curl | Copy the CSV into the repo on first use; store as `data/mining-signals-{patch}.csv`. |
| **deltaconsultingsc.com (§14b.3)** | Medium (Squarespace, can disappear silently) | Low — it's chart imagery, we'd manually transcribe only what we use | Hand-transcribe the 4–8 most important stations; link out for the rest. |
| **battlestations (§14b.7)** | Medium (pre-release, API pending) | Low today — not yet ingested | Re-check after the author ships their announced API. |
| **Buzz Killer HOTAS files, CCU Game, Hangar Link, FleetYards, VerseTime** | N/A | None | Not in the pipeline (out of scope per Pedro or redundant with existing sources). |
| **starcitizen-api.com** | N/A | None | Not in the pipeline. |
| **spviewer.eu**     | N/A | None | Not in the pipeline. |
| **sc-data/sc-unpacked-data (Gemini phantom)** | N/A — **does not exist** | None | Verified 404 on repo, org, and user. Future LLM paste-ins that cite this URL should be ignored — use `StarCitizenWiki/scunpacked-data` (§8) instead. |

## Per-entity Plan B

| If we lose…                  | …we keep these from… |
| ---                          | --- |
| Ship catalog                 | UEX → SC Wiki → erkul → scunpacked → RSI ship-matrix (5-deep, very safe) |
| Ship dimensions / mass       | SC Wiki → RSI → erkul (3-deep) |
| Ship combat (HP / shield)    | SC Wiki → erkul → scunpacked (3-deep) |
| Ship default loadouts        | erkul → scunpacked → sc.db.ship_loadouts (3-deep, all overlap) |
| Ship 3D model                | unp4k only (1-deep, highest risk for any "3D inspector" feature) |
| Ship images                  | RSI ship-matrix → SC Wiki media → UEX url_photo (3-deep, but only RSI works in browsers) |
| Components stats             | erkul → cstone → scunpacked → sc.db (4-deep, very safe) |
| FPS gear stats               | wiki_mining.json → cstone → scunpacked (3-deep) |
| FPS shop inventories         | cstone → sc.db.shops snapshot (the only sources at all) |
| Commodities                  | UEX only (1-deep, single point of failure) |
| Commodity prices             | UEX only (1-deep, single point of failure) |
| Commodity routes             | UEX only — but we can recompute from prices |
| Refinery yields              | UEX only |
| Fuel prices                  | UEX only |
| Blueprints                   | sc-craft.tools → wiki blueprints (2-deep, both small projects) |

## Things to do because of this register

1. **Daily backup of UEX prices to a local file** — even if UEX dies tomorrow we'd have last-known prices for at least one day. Store under `data/uex-snapshots/YYYY-MM-DD.json`.
2. **Pin every component dataset to a local mirror in sqlite** — UEX, erkul, cstone, sc-craft, wiki. The web sources become "best-effort refresh", the DB is the source of truth at query time. This is also a perf win.
3. **Don't hard-couple to UEX field shapes** — wrap every external row in our own `Drizzle` insert mapping (the legacy `static.ts` already does this). When a field renames upstream we patch one mapper, not 20 query sites.
4. **Prefer `slug` and `uuid` over numeric ids for cross-source joins** — UEX ids are stable but only meaningful inside UEX. `slug` is shared (mostly) between UEX/wiki/RSI; `localName` (lowercase class id) is shared between erkul/cstone/scunpacked.
5. **Set up an automated weekly diff** of erkul `/informations.liveVersion` — when it bumps, trigger a full static refresh.
6. **Treat sc.db as a one-time ETL source**, not an ongoing dependency. Migrate the rich tables (`shops`, `ship_loadouts`, `blueprints`, `blueprint_ingredients`, all the component tables) into the new Drizzle schema, then archive `sc.db`.

---

# Sources cited

- UEX 2.0 docs: <https://uexcorp.space/api/documentation/>
- UEX community tools: <https://uexcorp.space/api/community_made>
- SC Wiki Swagger UI: <https://docs.star-citizen.wiki/>
- SC Wiki API source: <https://github.com/StarCitizenWiki/API>
- StarCitizen-API.com: <https://starcitizen-api.com/api.php>
- unp4k (original): <https://github.com/dolkensp/unp4k>
- unp4k Linux fork: <https://github.com/camiicode/unp4k-for-starCitizen-data>
- scdatatools (Python): <https://pypi.org/project/scdatatools/>
- scunpacked (StarCitizenWiki fork): <https://github.com/StarCitizenWiki/scunpacked>
- scunpacked-data (JSON dumps): <https://github.com/StarCitizenWiki/scunpacked-data>
- ScDataDumper (active successor): <https://github.com/octfx/ScDataDumper>
- scunpacked (richardthombs original): <https://github.com/richardthombs/scunpacked>
- StarCitizen-GameData (XML→JSON): <https://github.com/Dymerz/StarCitizen-GameData>
- Hangar Data: <https://github.com/Copeman-1/StarCitizen-Hangar-Data>
- Modding extraction guide: <https://forums.starcitizenbase.com/topic/22691-how-to-guide-for-extracting-and-modding-star-citizen-assets/>
- RSI starmap API (undocumented, verified 2026-04-07): <https://robertsspaceindustries.com/api/starmap/star-systems>
- maps.adi.sc (ship deck .glb viewer): <https://maps.adi.sc/>
- ADI parent site: <https://adi.sc/>
- Delta Consulting SC (station pad charts): <https://www.deltaconsultingsc.com/chart-viewer-by-space-station>
- SC 4.7 Mineable Resource Signal sheet (Chameleon_69): <https://docs.google.com/spreadsheets/d/1n4qqOfwbtsOubUTMWJ532pBGoFbx567S/edit?gid=943032706#gid=943032706>
- Regolith: <https://regolith.rocks/>
- Armory (FPS gear DB, same author as Hauler): <https://armory.thespacecoder.space/>
- Armory backend (auth-locked): <https://armory-api.quartermaster.thespacecoder.space/>
- Rockbreaker mining calculator: <https://rockbreaker.peacefroggaming.com/>
- sc-cargo.space (cargo grid viewer by bjax): <https://sc-cargo.space/>
- Battlestations (ship role/station assignment): <https://battlestations.osiris-devworks.com/>
- Cornerstone Halo Belt route planner (knowledge base): <https://cstone.space/resources/knowledge-base/36>
- RSI Community Hub Cargo Grid Reference Guide: <https://robertsspaceindustries.com/community-hub/post/cargo-grid-reference-guide-vqkv5cQI8ZCLC>
- StarMeld (SC localization merge tool — replaces Gemini's fabricated `starcitizen-localization` ref): <https://github.com/BeltaKoda/StarMeld>
