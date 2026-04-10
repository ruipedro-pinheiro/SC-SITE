# Anvil Carrack — canonical specs (verified 2026-04-08)

## Sources consulted
- [RSI ship-matrix API](https://robertsspaceindustries.com/ship-matrix/index?search=carrack) — official CIG marketing/manufacturer data: dimensions, mass, cargo, crew, SCM speed, role, manufacturer code
- [star-citizen.wiki API v3 — vehicles/carrack](https://api.star-citizen.wiki/api/v3/vehicles/carrack) — community DB: cross-check on dimensions, hull HP, shield HP, fuel, components
- [Star Citizen Wiki (starcitizen.tools) — Carrack](https://starcitizen.tools/Carrack) — full component breakdown including the canonical hardpoint table (turrets, weapon counts, default loadouts, defensive devices, cargo grids, prices in aUEC and USD), patch / build info (4.6.0-LIVE)
- [Star Citizen Wiki — CF-557 Galdereen Repeater](https://starcitizen.tools/CF-557_Galdereen_Repeater) — confirms CF-557 is **S5 laser repeater by Klaus & Werner**, NOT a ballistic Gatling and NOT S2
- [Star Citizen Wiki — M7A Cannon](https://starcitizen.tools/M7A_Cannon) — confirms M7A is **S5 A-grade laser cannon by Behring**
- WebSearch cross-check (gamerant guide, scunpacked weapon entry, RSI Voyager Direct M7A listing) — corroborates turret counts and weapon sizes

## Identity
- **Name**: Carrack
- **Manufacturer**: Anvil Aerospace (code: ANVL)
- **Role**: Exploration / Expedition (career: Exploration, role: Expedition per ship-matrix)
- **Size class**: Large (Ship Matrix size L; in-game size class 5)
- **Class name (game data)**: `ANVL_Carrack`
- **UUID**: `f6d606c9-b324-4efa-814f-15a59047a6a5`
- **Game build verified**: 4.6.0-LIVE.11218823
- **Production status**: Flight-ready (since Alpha 3.8.0)

## Dimensions
- Length: **126.5 m** (RSI ship-matrix); star-citizen.wiki API reports 126 m — `126.5 m` is the canonical wiki/ship-matrix value
- Beam (width): **76.5 m** (RSI); 74 m on star-citizen.wiki API — use `76.5 m`
- Height: **30 m** (both sources agree)
- Mass empty (hull mass): **3,275,858 kg** (starcitizen.tools, star-citizen.wiki)
- Mass loaded: ~4,397,858 kg (RSI ship-matrix)
- Cargo capacity: **456 SCU** (all sources agree); breakdown: 6× 64-SCU large grids + 3× 24-SCU mid grids
- Stowage: 8,920,000 µSCU (~8.92 SCU personal stowage)
- Quantum fuel tank: 1× S3 internal tank (Kama Industrial C quantum drive)
- Hydrogen fuel tank: 2× S3 internal tank
- Hydrogen intake: 2× S5 fuel intake @ 0.4 SCU/s (0.8 SCU/s combined)

## Crew
- Minimum: **4** (starcitizen.tools)
- Maximum: **6** (starcitizen.tools, RSI ship-matrix)
- Note: star-citizen.wiki API reports min=max=6 — disagreement, see "Sources disagree" below
- Turret gunners: **3 manned turrets** (each 2× S4 = 6 gun stations); plus 1× remote turret operated from upper bridge starboard station
- Additional roles: pilot, co-pilot/sensor op (port station also can pilot), engineer, medic; medical bay is Tier 2

## Combat
- Shield generator: 2× S3 Barbican Industrial (B grade)
- Shield HP total: **180,000** (star-citizen.wiki API; quadrant-based — exact per-face split not exposed in scraped data)
- Hull HP (vehicle parts):
  - Middle: **70,000**
  - Front: 5,000
  - Rear: 3,000
  - Wings_l: 5,000  *(armor part only — NOT a hardpoint, see warning)*
  - Wings_r: 5,000  *(armor part only — NOT a hardpoint, see warning)*
- Damage resistances: -25% physical, -40% energy, 0% distortion/thermal/biochem/stun
- Signatures: CS/EM/IR all reported `0%` baseline modifier in scraped data — actual emission values not exposed
- SCM speed: 140 m/s; max speed: 1050 m/s; roll 30°/s, pitch/yaw 16°/s
- Self-destruct: 60 s, 30,000 dmg, 120 m radius

## Hardpoints (VERIFIED — no wing hardpoints, those don't exist)

The Carrack has **4 turrets total** (3 manned + 1 remote). All gun mounts are **S4** on **S5** turret bases. There are **no pilot guns**, **no chin guns**, **no nose guns**, and **no missile racks** on the Carrack — this is unusual for a ship its size and is a consequence of its exploration role.

| Location | Size | Type | Count | Typical default weapon |
|---|---|---|---|---|
| Top remote turret (controlled from starboard upper-bridge station) | S5 base | Remote turret | 1 turret with 2× S4 gun mounts | 2× S4 **CF-447 Rhino Repeater** (Klaus & Werner laser repeater) — via 2× S4 VariPuck Gimbal Mount A |
| Manned turrets (dorsal/aft + 2× broadside bubble) | S5 base | Manned turret | 3 turrets, each with 2× S4 gun mounts (6× S4 total) | 2× S4 **CF-447 Rhino Repeater** per turret — via S4 VariPuck Gimbal Mount A |
| Defensive — flare launcher | S2 | Countermeasure | 1 | Joker Defcon Flares (1× S1 magazine) |
| Defensive — chaff/noise launcher | S2 | Countermeasure | 1 | Joker Defcon Noise Launcher (1× S1 magazine) |
| Pilot / nose / chin guns | — | — | **0** | None — Carrack has no pilot-controlled guns |
| Missile rack | — | — | **0** | None — Carrack has no missile hardpoints |
| Wing hardpoints | — | — | **0** | None — `wings_l` and `wings_r` in game data are armor/hull parts, NOT weapon mounts |

**Weapon totals:** 8× S4 gun hardpoints (1 remote turret × 2 + 3 manned turrets × 2 = 8), all default-loaded with **CF-447 Rhino Repeater** (size 4 K&W laser repeater).

Source for the table: full component dump on [starcitizen.tools/Carrack](https://starcitizen.tools/Carrack) (Weapons & Utility section, game build 4.6.0-LIVE) — corroborated by gamerant Carrack guide and the SubliminaL loadout community page surfaced in WebSearch.

> Note: An older WebSearch summary mentioned "remote turret defaults to 2× S4 M6A laser cannons" — this disagrees with the canonical wiki dump which shows the remote turret as **CF-447 Rhino Repeater** in the current 4.6 game build. The remote-turret-as-M6A claim appears to be outdated (probably pre-3.x). Use **CF-447 Rhino Repeater** as canonical.

## Store / pricing
- Standalone pledge price (current): **$600.00 USD** (original $350.00)
- Warbond pledge price: **$500.00 USD**
- Standalone pledge: Yes — listed as standalone on RSI store
- Time-limited sales: yes (not permanently on sale)
- In-game buy price: **34,398,000 aUEC** at **Astro Armada — Area 18, Stanton**
- Rental: not available
- Insurance claim time: 48 m (expedite 16 m, expedite fee 19,595 aUEC)

## Patch history (recent / notable changes)
- **Alpha 3.8.0**: Carrack initially flight-ready
- Component / loadout data verified as of **build 4.6.0-LIVE.11218823** per starcitizen.tools (most recent build at time of writing)
- The Carrack ships with two additional craft: an **Anvil C8X Pisces** snub and an **RSI Ursa Rover** (loaner ships when garage bugged: Ursa, C8X Pisces Expedition)
- Granular per-patch deltas not exposed in the scraped pages — would need to scrape comm-link/patch-notes individually if a deeper history is required

## Important facts the scaffold mock-data MUST respect

1. **The Carrack has NO wing hardpoints.** The `wings_l` and `wings_r` entries that appear in unpacked game data are *armor / hull parts* with 5,000 HP each — they are NOT weapon mounts. Any mock data shape that includes a `wings: [...]` weapon array is **WRONG**.
2. **The Carrack has NO pilot guns and NO chin / nose guns.** All weapons are on turrets (3 manned + 1 remote). This is a deliberate design choice for the exploration role.
3. **The Carrack has NO missile racks.** Defensive devices are limited to 2× S2 countermeasure launchers (flares + chaff/noise).
4. **All gun hardpoints are SIZE 4**, mounted on **SIZE 5 turret bases**. There are exactly **8× S4 gun mounts** in total (4 turrets × 2 guns).
5. **CORRECTION TO THE TASK BRIEF — important.** The task brief stated *"Klaus-Werner CF-557 is S2 ballistic Gatling, not S5"*. This is **factually incorrect**. Per the [Star Citizen Wiki CF-557 page](https://starcitizen.tools/CF-557_Galdereen_Repeater) and scunpacked, the **CF-557 Galdereen Repeater** is in fact a **SIZE 5, A-grade LASER REPEATER** by Klaus & Werner — it is laser, not ballistic, not a Gatling, and it IS a size-5 weapon. So if the prior fake mock data put a "CF-557" on an S5 slot, the *size* was actually correct; what was likely wrong was either describing it as ballistic/Gatling, or putting it on the Carrack (which defaults to CF-447 Rhino, not CF-557 Galdereen) — or confusing it with a different K&W weapon. **The scaffold agent must not propagate the brief's error.** A real K&W ballistic gatling is the GP-33 MOD or similar, NOT the CF-557.
6. The canonical Carrack default turret weapon is **CF-447 Rhino Repeater** (Klaus & Werner, size 4 laser repeater), NOT M7A and NOT CF-557. If the scaffold wants an S5 turret-class weapon for stylistic reasons it should pick one whose canonical placement is S5 — e.g. **Behring M7A Cannon** (S5 laser cannon, exists in game) — but the *real* Carrack default is S4 CF-447 Rhino Repeater on every gun.
7. The Carrack houses an **Anvil C8X Pisces** (snub) and an **RSI Ursa Rover** in its hangar — mock data should reflect that these come bundled.

## Sources disagree (flag for team-lead decision)

- **Min crew**: starcitizen.tools says `4`, RSI ship-matrix also says `4`, but star-citizen.wiki API v3 says `6`. The `4` figure is more widely cited and matches the in-game minimum-to-fly. **Recommend: use 4.**
- **Length / beam**: starcitizen.tools and RSI ship-matrix both say `126.5 m × 76.5 m`; star-citizen.wiki API says `126 m × 74 m`. The `.5` figures come from CIG's own ship matrix. **Recommend: use 126.5 × 76.5 × 30.**
- **Per-face shield split**: only the total (180,000) is exposed in the scraped wiki/API data. Quadrant breakdown not available without an in-game inspection or a deeper scunpacked XML dive. **Recommend: store total only, leave per-face null.**
- **Remote turret default weapon**: one community summary claims "2× M6A laser cannons" on the remote turret; the current-build wiki component dump shows **CF-447 Rhino Repeater**. **Recommend: trust the wiki component dump (CF-447) — the M6A claim looks outdated.**
