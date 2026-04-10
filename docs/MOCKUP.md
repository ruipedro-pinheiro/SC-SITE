# sc-site — Design & Mockup

> Visual & interaction spec for the rebuild. Read this before writing a single
> line of UI code. Pair with `mockup.html` (the static visual proof) to feel
> what this is supposed to be.

---

## 1. Design vision

Opening sc-site should feel like walking into a private hangar bay at 3 a.m.
The lights are low. A few ships are parked in their berths, breathing
quietly. The camera drifts. You don't see a navbar, you don't see CTAs, you
don't see "Welcome to". You see a Cutlass Black, a Carrack, an Aurora MR
floating in scale next to each other, lit in mauve, and the only chrome is a
slim filter rail along the top edge and a search field that looks like it
costs nothing to use. The whole site is calm. It moves slowly. It treats
data as the subject and everything else as scaffolding. When you click a
ship, you don't navigate — the camera dollies in, the other ships fade, and
its stats unfold around it. The site's job is to make you forget the site
and think about the ship.

Two adjectives: **calm** and **deliberate**. Never noisy, never dense,
never trying to look like a hacker terminal. Linear's restraint, Vercel's
elegance, but the canvas is the room you're in.

---

## 2. Inspiration references

What we're learning from (and what we steal in one line each):

- **linear.app** — type rhythm, restraint, the way spacing speaks louder than borders. *Steal: spacing scale, font sizes, and "borders are barely there".*
- **vercel.com** — dark elegance, mauve-adjacent palette, generous margins. *Steal: how a heavy product can feel weightless.*
- **stripe.com** — best dense data UI on the web. *Steal: how it shows numbers without being a spreadsheet.*
- **observablehq.com** — living interactive figures embedded in calm prose. *Steal: charts as first-class citizens, not trapped in modals.*
- **bruno-simon.com** — proof that an entire site can BE a 3D scene without feeling like a stunt. *Steal: idle camera drift, spatial audio cues, the discipline to keep the UI minimal so the scene has air.*
- **threejs.org/examples** — reference for which techniques look elegant vs cheap. *Steal: thin-line postprocessing, EdgesGeometry overlays, fog falloff.*
- **rsi-website** (robertsspaceindustries.com) — the only place to learn the SC visual language without ripping it off. *Steal: ship typography conventions (manufacturer / model / variant), the way RSI displays ship dimensions.*
- **awwwards "JReyes MC" / "Floating Island" Three.js portfolios** — confirm that drifting between fixed camera waypoints feels better than free OrbitControls for narrative spaces. *Steal: waypoint-based camera moves with eased tweens.*

What we are NOT learning from (and why):

- **erkul.games** — perfect data, ugly UI, dense and hostile. We want erkul's *honesty about data* without its *visual contempt for the user*.
- **uexcorp.space** — the data source we'll consume, but the site itself is a beige spreadsheet. We'll do better by an order of magnitude.
- **spviewer.eu** — stale, but the *idea* of decorticating flight-model curves is exactly what the ship detail panel steals.
- **starcitizen.tools** (the fan wiki) — wiki density, infobox tables, hyperlink soup. We want the *information* available there, presented like Stripe docs.
- **maps.adi.sc** — interactive 3D deck layouts for capital ships (Idris, Perseus, Hammerhead, Reclaimer, Polaris, Starfarer) with holoview layers for internal components, fuses, medbeds, turrets. Beautiful execution of "components rendered on a 3D mesh", and directly adjacent to what §3 wants to do with hardpoints. What we steal: the discipline of overlaying marks on geometry instead of listing them in a side panel. What we don't: the capital-ship scope (maps.adi.sc is deck-interior, capital-only); our hangar handles the full catalog from Aurora to Javelin and uses the same "marks on a mesh" grammar for *exterior* hardpoints rather than interior rooms.

### The existing 3D-ships-at-scale niche — what we are measured against

The "pose ships at their real relative scale in a 3D scene" idea is **not** new. There are already several well-loved community tools doing exactly that, and we cannot ignore them. Our design has to clear their bar AND do something they don't.

- **Starship42 FleetView** (https://www.starship42.com/fleetview/) — the most-cited community 3D fleet viewer. URL-parametrised ship list, grid/matrix layouts, scales ships accurately using models derived from the RSI Holoviewer. *Feels like*: a personal fleet poster generator. Select ships → they appear posed together → take a screenshot → done.
- **Starship42 Compare** (https://www.starship42.com/compare/) — the same team's 2-ship side-by-side comparison tool. Pick two ships, see them auto-rescaled next to each other.
- **myfleet.gg** — Starship42's 2026-era successor. 241+ 3D ship models, drag-and-drop scene composition, import from HangarXPLOR / FleetYards, one-click share URL, screenshot export. Filter by manufacturer or size category only.
- **StarJump Fleet Viewer** (fleetviewer.starjump.org) — "see your entire fleet side-by-side in 3D" — search by name, add, manipulate, screenshot. Same pattern.
- **SC-Holoviewer** (starcitizen-community.de/en/holoviewer) — a downloadable desktop fleet-scale viewer with VR/OpenXR support, 328+ vehicles. Not a website, but the canonical community reference for "ships at scale in 3D".

**What they all have in common**, and where the niche ends: they are **fleet posers**. You arrive knowing which ships you want to see. You add them. You pose them. You share or screenshot. *None of them are ship catalogs.* None of them let you filter by a mechanical stat ("quantum tank ≥ 50k units") or by cross-source criteria ("buyable at Orison", "STV-capable"). None of them answer a question — they only render a choice you already made.

**That gap is where sc-site lives.** See §3 for how the big-bet differentiator threads the 3D-at-scale idea *through* a cross-source query rail, so the 3D scene becomes the *response surface of a query* instead of a passive fleet display. We clear the Starship42 bar on the visual side (same data, same scale honesty, nicer lighting) and then do the thing nobody has done: make it filterable.

---

## 3. The big-bet differentiator

**The cross-source query is physicalised in a 3D hangar bay.**

The site has two differentiators that are worthless apart and unstoppable
together:

1. **Cross-source query** — ingest 4+ sources (UEX, SPViewer, erkul, CStone,
   FleetYards, wiki) into one unified ship/item row, and let the user ask
   questions no single source can answer. This is the engineering bet and
   it is the reason people will keep the tab pinned. §5 details the UX.
2. **3D hangar catalog** — the list of matching ships from the query is
   rendered as actual ships posed at real relative scale in a 3D hangar
   bay. Filtering isn't a list-repaint; it's a *physical reflow of the
   room*.

Either one alone is mid. Together they are the thing nobody has built.
Starship42 / myfleet.gg / StarJump already do the 3D at-scale posing (§2);
erkul / SPViewer / CStone already do the data. **The whitespace is the
integration**: the query IS the 3D scene's content.

### The spine, walked through

There is no `<ShipsCatalog>` grid. When you load `/` you do not see cards.
You see a wide, low-lit room — a deck of an Idris-class carrier, basically —
with a polished metal floor reflecting a slow mauve light, and several
ships parked along it in their actual relative scale. An Aurora is two
metres tall and looks two metres tall next to a Cutlass that is 38 metres
long. A Carrack at the end of the row is huge. The camera drifts along the
deck on rails, very slowly, never centred on anything in particular —
like an idle game-engine camera in cinematic mode.

The ships start as **stylised procedural placeholder meshes** — sized to
real dimensions, tinted by manufacturer, edge-overlaid in mauve. As Pedro
manually datamines and scp's `.glb` files into `public/ships/`, those
placeholders are upgraded one at a time. **The hangar must look great
with zero GLBs and identical with all of them.** See §10 for why this is
the only honest plan, and `mockup.html` for what zero-GLB-coverage
already looks like.

Above the hangar, pinned to the top of the viewport, is the **query rail**
— a single thin strip of composable filter chips ("QUANTUM TANK ≥ 50k",
"STV-CAPABLE", "BUYABLE @ ORISON", "PRICE ≤ 1M aUEC"), each of which
represents a constraint pulled from a *different* source in the unified
schema. Toggle or add one and ships *physically slide out of the hangar*:
the eliminated ones drift up and out of frame with a 600ms ease, the
remaining ones reflow into new berths over the same duration. There is
no page repaint. No virtual scrolling. No card hover state. **The list
is the room**, and the room re-poses itself to answer your question. The
query rail is detailed in §5.

Search is a single input top-centre. Type "freelancer" and the camera
auto-pans to the MISC Freelancer, raising a small label tag above it. Press
Enter and the camera dollies in to the hero pose for that ship. Type a
question instead — "ships with the biggest quantum tank that can carry an
STV and are buyable at Orison" — and the rail materialises three chips
from that natural language, the hangar reflows to the matching handful,
and the universe map (§4 `/map`) lights up Orison in the background.

Click any ship (or press Enter on a search hit), and:

1. The other ships in the hangar fade their materials to ~12% opacity.
2. The clicked ship rotates 30° and floats up to the centre of the frame.
3. Three stat panels fade in around it — top-left (identity: manufacturer / role / size), bottom-right (combat: shields / hull / weapons), bottom-left (logistics: SCU / crew / range).
4. The URL becomes `/ships/cutlass-black?q=<encoded-query>` (pushState only — no reroute, the canvas is uninterrupted). The query travels with the URL so the share link reproduces *both* the ship AND the query context.
5. Press Escape (or click empty space), the panels fade out, the ship returns to its berth, the other ships return to full opacity.

You can keep "flying through" to the next query-matching ship by pressing
`→` / `←` — the camera glides to the neighbour and the panels swap. No
loading, no flicker. The catalog and the detail page are the same scene
at two zoom levels, both filtered by the same query.

This is the spine. Every other page is built around respecting how good
this feels, and every other page is *reachable from a query result*.

**Section 4 explains how each page expresses (or politely steps aside from)
this spine; §5 details the cross-source query UX.**

### Hardpoints as spatial marks on the mesh

When a ship is hero-posed (via click, search hit, or neighbour skip), the
mesh gains a thin layer of **hardpoint markers** — one small mauve dot
(1.5 px radius, `#cba6f7` at 70% alpha, no flash, no pulse) at the exact
world-space position of every weapon mount. The positions come from RSI's
internal HoloViewer endpoint
(`/api/investigation/v1/ship/[SHIP_ID]`, documented in `SOURCES.md`),
which returns hardpoint nodes as x/y/z offsets relative to the ship's
origin. The data-sources agent has the ingestion path scoped out; the
frontend contract is: `ship.hardpoints[]` with `{ id, xyz, size,
gimbal_type, mounted_item_uuid }`.

The marker layer is **only visible on hero-posed ships**. In the wide
hangar overview the dots are suppressed — ships-at-scale is the subject
there, not weapon geography. The moment the camera dolly-ins (900ms
`easeInOutCubic`, per §9), the dots fade in over the last 200 ms of the
tween, synced to the identity/combat/logistics panels from step 3 above.

**Hover** (120 ms delay before the tooltip so a mouse sweep doesn't rattle
the canvas):
- A thin hairline callout extends from the dot to the side of the canvas
  — same `linear-gradient(90deg, transparent, rgba(203,166,247,0.55),
  transparent)` hairline as the focused-panel style in `mockup.html`.
- The callout's text block uses the same 11 px `subtext1` body + 10 px
  `overlay0` meta as `.ship-label` (`mockup.html:57-74`). Contents, in
  mono where the values are numeric:
  - Weapon size badge (`S1` — `S10`).
  - Gimbal state (`fixed` / `gimbal` / `turret`).
  - Currently mounted item (manufacturer + name, pulled from erkul via
    `mounted_item_uuid`).
  - DPS at optimal range (from CStone/erkul, with source badge in the
    same 2-letter grammar as §5.1 query chips).

**Click** a dot:
- The hardpoint becomes the camera focus point. Camera performs a small
  dolly-in (600 ms ease, reused from the neighbour-cycle budget in §9) so
  the mount sits at frame centre.
- The weapon spec panel opens **inline on the right**, not as a modal
  (§11 forbids modals). It uses the same panel-hairline top border as the
  identity/combat panels and has the same 24 px internal padding as §7.
- Escape or a second click on empty space dollies back out, panel fades
  (220 ms, pure opacity per §9).

**Filter integration — the query IS the visual response**. When the
active cross-source query contains a hardpoint constraint (e.g. `hardpoint
size ≥ S4 [ER]` from the popover in §5.2, or an NL-parsed phrase like `S4
gimbal on nose`), the dots split into two classes on every hero-posed
ship that matches:
- **Matching** hardpoints stay mauve at full alpha.
- **Non-matching** hardpoints fade to `subtext0` at 30% alpha and their
  tooltips become muted.

So the chip in the query rail doesn't only reshape *which ships are in
the room* (§3 existing behaviour) — it also reshapes *which mounts on
each remaining ship are lit*. The same chip works at two scales: room
layout and weapon layout. This is the same spine as the hangar reflow,
one level deeper.

This layer is the concrete manifestation of the big-bet differentiator:
**multi-source join rendered as spatial marks on a mesh**. Hardpoint
positions come from RSI HoloViewer; weapon specs come from erkul; DPS
comes from CStone; the mount state comes from the unified schema. Four
sources, one dot. Nobody else does this — `maps.adi.sc` does interior
components on capital ships (§2), Starship42 shows the mesh without any
overlay, erkul lists hardpoints as a plain table divorced from geometry.
We stitch the table to the mesh.

### How this differs from Starship42 / myfleet.gg / StarJump

| Dimension             | Starship42 FleetView / myfleet.gg / StarJump | sc-site |
| ---                   | ---                                          | ---     |
| Entry point           | "Add ships to your empty fleet."            | "Here is every ship, filtered to what you asked for." |
| 3D scene role         | Passive display of user-chosen ships.        | Response surface of a live query. |
| Filter dimensions     | Manufacturer, size category.                 | 10+ cross-source axes including quantum tank, STV-capable, buyable-at-X, has-known-bugs, etc. |
| Data spine            | A hand-curated ship list.                    | Unified schema aggregating UEX + SPViewer + erkul + CStone + FleetYards + wiki. |
| Shareable URL contains| List of ship slugs.                          | Whole query + optional focused ship. |
| Primary use case      | Making screenshots of your fleet.            | Answering ship-buying questions no single tool can answer. |
| Mobile behaviour      | Pose ships smaller, same UX.                 | Same query, portrait 3D, filter rail collapses into a horizontal scroll strip. |
| What it can't do      | Answer "which ship is best for X".           | Beat a fleet-poser at being a fleet poser (which we don't try to). |

We are *not* trying to steal the "pose my personal fleet for Reddit"
use-case. That problem is solved and we let Starship42 / myfleet.gg /
StarJump keep it. Our lane is answering **"which ship is best for X given
A, B, C"**, with the 3D hangar as the answer.

### Why not the other 3D ideas Pedro's memo listed

| Idea                 | Why not the spine |
| ---                  | ---               |
| Universe map IS nav  | Cool, but Stanton's planets aren't the value. Pedro plays SC for the *ships*. The map is a secondary delight, not the front door. It is however *integrated* into the query rail — see §4 `/map` and §5.5. |
| 3D trade routes      | Trade is one tab. A 3D-only trade page is a stunt; trade UX is fundamentally a sortable table. The trade page does pick up a mauve 3D route arc overlay from the selected row (§4 `/trade`). |
| 3D mining moons      | Too narrow to carry the spine. Promoted to the mining page only (§4 `/mining`). |
| Hangar + query rail  | Chosen. Touches the page Pedro said the user lands on; physicalises the cross-source query; extends into map/trade/mining via the shared query state. |

### Risks acknowledged up front

1. **3D model availability is the load-bearing risk.** The data-sources teammate has confirmed in `SOURCES.md` that ship geometry is **only obtainable via unp4k extraction from a local SC client install** — UEX, RSI, erkul, scunpacked, the wikis: none of them expose `.gltf` or `.cgf` files. Pedro doesn't run SC on the Pi, so the GLB pipeline is **manual and one-shot**: extract on Fedora desktop → convert `.cgf` → `.gltf` (community tooling) → optimise to draco-compressed `.glb` → `scp` to the Pi's `apps/web/public/ships/`. There's no live ingest, no scheduled refresh. This is acceptable because ship geometry barely changes between game patches. Section 10 details the gradual-coverage model and the fallback when a model is missing.
2. **IP greyness.** Extracted geometry is CIG copyright. Public hosting is not safe. Pedro's Pi is **deployed over Tailscale** (`100.105.42.81`, no public DNS, no public ingress) — this is a private/friends deployment, not a public web app. That posture is what makes the GLB strategy defensible. **The site is never to be exposed publicly without first ripping the GLBs out and reverting to the placeholder meshes.** This rule is non-negotiable and worth stating in CLAUDE.md once it's rewritten.
3. **GLB total weight** if Pedro reaches full coverage: ~60–100 ships × ~5–12 MB each ≈ **300 MB – 1 GB total**. We lazy-load: only the ships currently in the camera's field of view get their full GLB; everything else uses a low-poly proxy until you camera-near it. Section 10 details the LOD strategy.
4. **WebGL2** is required for the postprocessing pass. Excludes ~3% of mobile users (per caniuse). For them, render the 2D fallback grid (yes, the boring grid we hate — but only as graceful degradation).
5. **Performance**: the hangar scene must hold 60 fps on Pedro's M-series Mac and *something acceptable* on a mid-tier phone. Plan: aggressive instancing for the hangar architecture, frustum-culled GLB loading, `prefers-reduced-motion` path that disables idle camera drift.

---

## 4. Page-by-page concept

### `/` — the hangar (the differentiator, the front door)

```
┌──────────────────────────────────────────────────────────────────────┐
│       search — ship name or full question ▸           save  share   │ ← top: 64px, transparent over canvas
│                                                                      │
│  🔎 quantum tank ≥ 50k [SP] ×   🔎 STV-capable [FY] ×                │ ← query rail, 12px below search
│  📍 buyable @ orison [CS] ×    💰 ≤ 1M aUEC [UEX] ×    + add        │
│                                                        4 MATCH       │
│                                                                      │
│        ╭────╮          ╭───────────╮          ╭─────╮               │
│        │    │   ▲      │           │          │     │               │ ← three.js canvas, full-bleed
│        │ 🛸 │   │      │    🛸    │          │ 🛸 │               │
│        ╰────╯          ╰───────────╯          ╰─────╯               │
│         CARRACK         CORSAIR              MSR                     │ ← labels are quiet, 11px subtext1
│         ───                ───                  ───                  │
│                                                                      │
│  4 SHIPS · DRAG TO PAN · CLICK TO INSPECT           hangar · map ·   │ ← bottom-right text nav
│                                                     trade · mining    │
└──────────────────────────────────────────────────────────────────────┘
```

- **Three.js role**: this page IS the three.js scene. Hangar architecture (floor, low pillars, ceiling cables, ambient sky-blue rim lights) + N ship proxy/GLB meshes + camera drift + raycaster picking.
- **Content density**: nearly zero traditional UI. The query rail is the only chrome; the data is *the ships themselves*.
- **Interactions**: drag to pan camera laterally along the hangar deck; scroll to dolly in/out; click ship to enter detail-pose; `⌘K` opens the command palette (jump-to-anything + saved queries); `f` opens the chip-builder popover (§5.2); `?` shows keyboard help.
- **Query state lives here**. The other pages (§4 `/map`, `/trade`, `/mining`) inherit the current query via the `?q=` URL param and *reinterpret* it in their own coordinate space. See §5.5.

### `/ships/[slug]` — ship detail

NOT a separate page in the routing sense. It's the same hangar scene
re-posed. The URL is updated via pushState so the page is shareable, but
hitting `/ships/carrack` directly initialises the scene with the camera
*starting* at Carrack-centred hero pose instead of the wide overview.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← back to hangar              CARRACK    ANVIL AEROSPACE            │ ← top: 64px, "← back" left, ship name center
│                                                                      │
│  ┌────────── identity ──────────┐                                   │
│  │ EXPLORATION  · LARGE         │                                    │
│  │ 6 CREW · 123 m · 1144 SCU    │                                    │
│  └──────────────────────────────┘                                    │
│                                                                      │
│                                                                      │
│                          ╭─────────────────────╮                    │
│                          │                     │                     │
│                          │      🛸  3D model   │                    │ ← the GLB itself, slowly rotating
│                          │                     │                     │
│                          ╰─────────────────────╯                    │
│                                                                      │
│                                                                      │
│                                              ┌──── combat ────┐     │
│                                              │ 4× SIZE-3 GUNS │     │
│                                              │ SHIELD: 70 K   │     │
│                                              │ HULL  : 90 K   │     │
│                                              └────────────────┘     │
│                                                                      │
│  ← prev (CATERPILLAR)        ESC to close        next (CONSTELLATION) → │
└──────────────────────────────────────────────────────────────────────┘
```

- **Three.js role**: same scene, camera tweened to the hero pose of one specific ship; panels fade in as `<div>` overlays positioned with `vector3.project()`.
- **Content density**: three small panels orbiting the ship — never more. If the user wants the wiki-density spec sheet, there's a `[ full spec ▾ ]` toggle bottom-centre that *expands a sidebar over the canvas* instead of replacing the scene.
- **Interactions**: arrow keys cycle ships; Escape exits to wide hangar; clicking the model itself starts a manual orbit (OrbitControls take over until you stop).

#### Damage-resistance strip — inside the combat panel

The **combat** panel (bottom-right in the ASCII sketch above, currently
holding `4× SIZE-3 GUNS · SHIELD · HULL`) gains a fourth row: a compact
**damage-resistance strip**. Five thin horizontal bars stacked vertically,
one per damage type: `Physical · Distortion · Energy · Thermal ·
Biochemical`. The strip is a **stacked bar**, not a radar chart.

**Why a bar and not a radar**. A radar/spider plot reads quickly *only*
for trained eyes — the shape encodes the data but a user has to mentally
map each axis back to its label every time. A 5-row bar is readable in
two seconds flat: the longest bar is obviously the ship's best-resisted
damage type, the shortest is its weakness, the eye travels top-to-bottom
in the one direction text already goes. Linear/Stripe consistently pick
bars over radar for exactly this reason, and the site's whole restraint
principle (§1) is "data in two seconds". Radar loses.

**Spec**:
- **Size**: the whole strip is `200 × 92 px`, sitting below the hull row
  inside the combat panel. Each of the 5 bars is `200 × 8 px` with `8 px`
  vertical gap, a `10 px` label to the left (`overlay0`, label case),
  and a `10 px` numeric value right-aligned in mono.
- **Fill**: bar width is proportional to `1 / aggregated_multiplier`
  (so *higher resistance = longer bar* — "big = good", the only
  orientation the user should ever have to learn). Fill colour is
  mauve `#cba6f7` at 55% alpha against a `surface0` track at 100%.
  No green-for-good, no red-for-bad — the site is calm (§8 rule 3).
  The value variant on the two strongest and two weakest bars is a
  1 px inner border: `sky #89dceb` on the two highest (informational
  accent) and `peach #fab387` on the two lowest (the same peach used
  for warning-adjacent states per §8). The middle row gets no accent.
- **Position**: immediately below the `HULL` row inside the combat panel,
  separated by a 1 px `surface0` hairline and 12 px of padding above /
  below. The combat panel grows vertically to accommodate; the 3D scene
  layout is unaffected because panels float via `vector3.project()`.

**Interaction**:
- **Hover a bar** → a small inline sublist appears inside the combat
  panel (not a floating tooltip — §11 bans tooltips on everything)
  listing the **top 4 contributing components** to that row's
  aggregated multiplier, each as `{ component name · multiplier ·
  [source badge] }`. The hovered bar gets a 1 px mauve outline.
- **Click a bar** → the row becomes sticky (the sublist stays open
  until another bar is clicked or Escape is pressed), and the 3D ship
  mesh does a small visual echo: if the detail page is in the middle
  of the hardpoint-marker view from §3, the markers of the contributing
  components light mauve for 600 ms and then return to their previous
  state. The damage-resistance row and the hardpoint-marker layer are
  the same data at different scales.
- **Focus** (keyboard): the strip is a single focusable composite;
  arrow-up/arrow-down cycles the active row, Enter is equivalent to
  click.

**Data binding**: reads `component_damage_map` (see the Gemini dump
reference in `_research/gemini-architecture.md` §2 — Component Damage
Map) joined against the ship's current loadout. Aggregation is
**client-side**: the Hono API returns the per-component multipliers
for every component in the ship's default loadout in a single flat
array, and the frontend computes the per-damage-type weighted mean.
This keeps the endpoint cache-friendly (ship-scoped, no per-variant
matrix) and the arithmetic cheap (≤ 60 components × 5 types).

**Why this matters**. It answers a question that no existing SC tool
answers: *"how does this ship absorb a Mantis EMP, an Ares Inferno
cannon, a Deadbolt sniper round?"* Erkul shows shield HP. SPViewer
shows flight curves. Neither of them exposes the underlying damage
multiplier table from `Vehicles/Damage/`, because that data lives
deep inside `sc-unpacked-data` and has no public surface outside of
a handful of reverse-engineered dumps. Surfacing it is a concrete
differentiator on top of the cross-source-query spine: the query rail
picks the ships, and the detail panel tells you how they actually
survive the weapons you care about. The strip complements the shield
HP row — it does not replace it — because shields and internal
resistance are two independent survival budgets.

#### History drawer — patch-level change timeline

Below the combat panel, the detail scene gains an understated drawer
collapsed into a single-line trigger:

```
┌──────────────────────────────────────────────────────────────────────┐
│  history  ·  12 changes across 4 patches                        ▾   │
└──────────────────────────────────────────────────────────────────────┘
```

One word: **history**. Lowercase. No icon. 13 px `subtext1` label, a
neutral `·` separator, then a count in `overlay0`. The drawer lives
inline at the bottom of the detail view, above the `← prev / next →`
ship-cycle row. Clicking the trigger expands the drawer upward in
place with a 220 ms opacity fade (no slide, per §9).

**Expanded**, the drawer is an inline column, not a modal:
- Desktop: it sits flush against the right edge of the canvas, `360 px`
  wide, floating over the scene at `bg-mantle/70 backdrop-blur-md`, the
  same surface treatment the search bar uses in `mockup.html:97`. The
  combat / logistics panels slide their `vector3.project()` anchors
  laterally by the drawer width so nothing overlaps.
- Mobile / narrow viewport (< 720 px): the drawer becomes a bottom-sheet
  taking the full width, above the safe-area nav strip.

**Content** — a vertical timeline of patches in which *this ship*
changed. Newest first. Each row:

```
4.7.0-LIVE.11576750           2026-03-12
+5% shield HP · -2 SCU cargo · new skin: "IAE-2953 special"   ▾
```

- Version string in mono `13 px`, `subtext1`.
- Date in `overlay0`, right-aligned.
- A one-line summary in `14 px` body text, using the same `·` separator
  as the ship labels, with field deltas picked from the three highest-
  magnitude changes in the patch.
- **Hover a row** → the row expands inline to show the exact field
  diffs, one per line: `shield_hp: 5000 → 5250`, `cargo_scu: 42 → 40`,
  mono, with the old value in `overlay0` and the new value in `text`.
  No tooltips: the expansion is part of the row.
- **Click a row** → the row becomes sticky (stays expanded until
  another row is clicked), and if the field being shown has a spatial
  representation anywhere in the detail view (e.g. a hardpoint gained
  or lost a weapon — see §3), the corresponding marker flashes mauve
  for 600 ms. Same echo pattern as the damage-resistance strip.

**Category filter** — at the top of the drawer, a single row of four
small chips matching the query-rail chip style from §5.1 at 24 px tall:
`combat · mobility · economy · cosmetic`. Default: all four active.
Clicking a chip toggles the category. The count beside `history` in
the collapsed trigger updates live as the user filters. Categories are
derived server-side from the `field` column of the `change_log` table
(see `_research/gemini-architecture.md` §3.9): weapon / shield / hull
fields map to combat, thrust / mass / quantum to mobility, price / SCU
/ rental to economy, skins / paint / livery to cosmetic.

**Empty-state rule — the drawer only renders if there is something in
it**. For a ship with zero rows in `change_log` (brand-new addition
since ingestion started), the drawer is replaced by a one-line static
label in `overlay0`: `history · no changes since 2026-02-14`. No
filters, no trigger affordance, no expand chevron. A ship with nothing
to say says nothing.

**Why this matters**. Every other SC tool is a *snapshot* of the
current patch — erkul recomputes its DB when CIG pushes, SPViewer
republishes curves, the wikis get manually edited lagging by weeks.
Nobody is the **historical memory** of how a specific ship has
evolved. The `change_log` table the ingestion agent is adding makes
sc-site the first place a pilot can open a Carrack and read "the
quantum fuel tank dropped 15% in 4.6.1, recovered in 4.6.3, and the
rear turret became gimbal-capable in 4.7.0" — a sentence that costs
minutes of wiki archaeology to reconstruct today. The drawer is the
most direct extraction of value from field-level change tracking: no
additional endpoints, no derived analytics, just the log rendered as
prose.

### `/map` — Stanton 3D system view (and the query's spatial projection)

A separate 3D scene (not the hangar). Same Three.js engine, same camera
language (drifting, eased), same spatial restraint. Planets as low-poly
icosahedra wrapped in mauve `EdgesGeometry`, moons orbiting, jump points
as dashed lines toward the screen edges, station dots in sky blue.

- **Three.js role**: secondary 3D experience, reached from `⌘K` ("go to map") or the `map` text-link in the bottom-right nav.
- **Why not the homepage**: ship browsing is the primary task; the map is eye candy + *the spatial projection of the active query*. Front doors are for tasks.
- **Query integration (§5.5)**: if the current `?q=` contains a location axis (e.g. `buy_at:orison`), matching stations are lit mauve and all others dim. A slim side panel lists the query-matching *items* at each highlighted station, with `→ fly to ship` links that jump back into the hangar focused on a specific match. If the query has no location axis, the map is just a map.
- **Interactions**: orbit, zoom, click planet → side panel with stations (still calm, no floating tooltips).

### `/trade` — trade route planner

2D, dense, fast, deliberately calm. Sortable table with route pairs (BUY @
station X / SELL @ station Y / margin / SCU required / one-way distance).
A single small inset 3D minimap top-right shows the selected route as a mauve
arc through the system (inspired by SnarePlan's quantum arc modeling, but
calm instead of combative), and the table is the work surface.

- **Three.js role**: the inset 3D map (220×220 px) shows the selected route as a mauve arc between the two stations. Not decorative — the arc updates as the user scrubs rows.
- **Query integration (§5.5)**: if the hangar query has a ship axis (e.g. `cargo ≥ 200 SCU`), the trade table filters route suggestions to "routes viable for ships matching this query" — i.e. only shows routes whose required SCU fits the matching ships' holds. This turns the hangar query into a trade filter without any extra UI.
- **Density**: rows can be tight (12px line-height with 12px padding), but font is 14px. *Not* a spreadsheet — a Stripe-style data list.

### `/mining` — prospector tool

2D 2-column layout. Left: searchable list of moons / asteroid belts / lagrange
points with their hotspot composition. Right: a single 3D moon viewer for the
selected location, with hotspot overlays as coloured spheres on the surface —
inspired by how **Regolith** displays mineral spawn zones, but adopted into
the same calm, mauve-accented 3D language as the hangar.

- **Three.js role**: the inset moon viewer (~520×520 px) is interactive — drag to rotate, click hotspot for composition breakdown.
- **Query integration (§5.5)**: the query rail is repurposed here with a single composition axis (`ore: quantanium ≥ 40%` [`WK`/`Regolith`]) and a ship-class filter (`mineable-by: prospector` [`FY`]). Hotspots on the moon that satisfy the ore threshold glow mauve; the rest dim.
- **Density**: medium. Composition tables use the same calm 14px text rules.

### `/weapons`, `/components` — reference pages

Dense 2D, no 3D. Sortable filterable lists. Linear-style row layout: thumbnail
left (pulled from RSI media), name + manufacturer + size, three or four key
stats inline, click for an expanded inline detail row (no navigation). These
pages exist to be *fast* — open, ctrl-F, find, close.

### Optional extension: `/loadout/[slug]`

Per-ship loadout editor (mount weapons/components onto a ship). Heavy 2D —
table on the right, 3D ship model on the left with hardpoint markers
highlighted as you hover the table rows. Lower priority — ship after the
hangar works.

---

## 5. Cross-source query UX

This is the **engineering-half of the differentiator** and the reason
people stay. §3 explains *why* it matters; this section is *how it works
for the user*.

Pedro's canonical example, repeated here because it is the north star:

> *"Which ship has the biggest Quantum tank (SPViewer) that can also carry
> an STV (FleetYards) and is buyable at Orison (CStone)?"*

No existing tool answers this in one interface. sc-site must, and it must
feel obvious.

### 5.1 The query rail — composable filter chips

At the top of the hangar canvas, a single thin horizontal rail holds all
active constraints. **Every chip is a constraint.** Every chip has a
*source badge* (the logo or 2-letter code of where the data came from:
UEX, SP, ER, CS, FY, WK) so the user can see at a glance *which source
is backing each claim*. Source attribution is non-negotiable — it's what
separates us from yet another aggregator that says "trust me".

```
┌──────────────────────────────────────────────────────────────────────┐
│ ALL SHIPS  |  🔎 quantum tank ≥ 50k  [SP] ×  |  🔎 STV-capable [FY] × │
│            |  📍 buyable @ orison [CS] ×  |  💰 ≤ 1M aUEC [UEX] ×    │
│                                                            + add     │
│                                                                      │
│                               4 MATCH                                │ ← live match count
└──────────────────────────────────────────────────────────────────────┘
```

- Each chip: 28px tall, 12px horizontal padding, 1px `surface0` border, background `mantle/50`. Active chip: 1px `mauve` border, `mauve/6%` background fill. Hover: border fades to `surface1`.
- Source badge: 2-letter code in `overlay0` (e.g. `SP`, `FY`, `CS`) at 9px, with a coloured dot to its left (different source = different dot colour, picked from the accent palette). The dot is 4px — small and dignified, not a traffic-light badge.
- Close × on the right of each chip, visible only on hover.
- `+ add` button on the right of the rail opens the chip-builder popover (§5.2).
- Below the rail, right-aligned, is a tiny `N MATCH` live-updating count (11px `subtext0`). When N drops below 1 the number turns `peach` and a hint appears: `no ships match — try relaxing [quantum tank ≥ 50k]` (the hint picks the most-restrictive chip using a heuristic from the server).

**Critical**: chips are AND by default. When the user wants OR they explicitly
group chips — click two chips with shift-click → they fuse into a pill-group with
an `OR` badge inside. No boolean builder UI, no parentheses, no SQL-shaped UI —
just the chip, the OR pill, and the count. Anything more complex than
`(A OR B) AND C AND D` is a power-user need we won't design for.

### 5.2 The chip-builder popover

Clicking `+ add` opens a small popover (300×auto px) that is the *only* piece
of dense UI in the site. It is deliberately dense because it is the one
place where power matters more than calm.

```
┌──────────────────────────────────┐
│ add filter                    ⌘K │
│ ──────────────────────────────── │
│  identity                        │
│    manufacturer                  │
│    role                          │
│    size class                    │
│                                  │
│  performance  [SP]               │
│    quantum tank ≥ ___ units      │
│    max speed     ≥ ___ m/s       │
│    zero-g pitch rate             │
│    IR signature    ≤ ___         │
│                                  │
│  loadout  [ER]                   │
│    DPS ≥ ___                     │
│    shield HP ≥ ___               │
│    hardpoint size ≥ S4           │
│                                  │
│  cargo & bay  [FY/WK]            │
│    SCU ≥ ___                     │
│    vehicle bay fits: [ STV ▾ ]   │
│    crew = ___                    │
│                                  │
│  availability  [CS/UEX]          │
│    buyable at: [ Orison ▾ ]      │
│    buy price ≤ ___ aUEC          │
│    rentable                      │
│    pledgable only                │
│                                  │
│  lore & status  [WK]             │
│    release status                │
│    known bugs (issue-council)    │
└──────────────────────────────────┘
```

- Categories are collapsible; each category header is coloured by source accent.
- Inline inputs (numeric threshold, dropdown) let the user commit a chip in one interaction.
- Type-ahead at the top (`⌘K` mimic): typing "quantum" jumps the active row to the quantum tank filter.
- The popover is the ONLY place where data-source attribution takes centre stage — every category header shows which source(s) back it.

### 5.3 The NL-bar shortcut

The top-centre search input is a *dual-mode* field:

- **Short mode** (default, matches old behaviour): typing a ship name fuzzy-matches and auto-pans the camera.
- **Long mode** (kicks in when input is >3 words or contains `≥`, `<`, `@`, `:`, or the word "and"): parses into structured chips. A small mauve underline fades in beneath the input to signal "I understood this as a query".

The parser runs server-side using a deterministic grammar (not an LLM — keep
this one honest). Grammar examples that must parse:

```
quantum tank >= 50k, STV capable, buy @ orison
ships under 1M aUEC with > 400 SCU
combat ships size 2 that can buy at area18
exploration with quantum fuel range > 60gm and crew = 1
```

Unparseable queries show an inline hint (`couldn't parse "with ≥ 400 SCU": did you mean "cargo ≥ 400"?`) and do not modify the rail. On successful parse, each structured constraint becomes a chip in the rail with a soft 200ms fade-in, the input clears, and the hangar reflows.

**The NL bar is a shortcut, not the source of truth.** The rail is canonical. The NL bar is a typing convenience for power users who don't want to click `+ add` four times. A newcomer can ignore it completely and still use the rail via the popover.

### 5.4 Saved queries & share links

The URL is the database.

- The query rail serialises itself into a short `?q=` URL param (~20-80 characters for typical queries). Hitting the URL reconstructs the rail exactly, runs the query, and reflows the hangar.
- A small `save` icon (the only icon in the header region) appears in the rail's right-hand side when ≥1 chip is active. Click to name the query → it's stored in `localStorage` under the shared `sc-site.savedQueries` key. Saved queries appear as the first section of `⌘K` ("your queries"): pressing Enter on one re-applies the rail.
- `share` right next to `save` copies the current URL to clipboard with a 120ms mauve flash on the icon. No URL shortener, no tracking, no "share to Reddit" button — just a URL.
- **No accounts, ever.** Pedro has been clear: personal Pi deployment, no login, no backend user state. All saved queries are client-side.

Example shareable URL (illustrative):

```
https://sc.pedro.local/?q=qt_gte:50000;stv:1;buy_at:orison;price_lte:1000000
```

Anyone who opens that URL sees the exact 4 ships that matched Pedro's original question, posed in the 3D hangar, at scale, with source attribution visible.

### 5.5 Integration with the universe map

When a query has a **location axis** (e.g. `buyable at: Orison`, or `hotspot in: Yela`), the `/map` page inherits the active query and *lights up the matching stations* in mauve while dimming the rest. The map isn't a separate tool any more — it's the **spatial view of the same query**.

Clicking a highlighted station on the map opens a thin side-panel that lists the query-matching items *available at that station*, with direct links into the hangar's ship detail pose (`→ fly there` in the hangar), so the user can jump back to the 3D hangar focused on a specific matching ship without losing the query.

This is the "3D differentiator and cross-source query differentiator should be complementary, not competing" principle, made concrete. The query is the thread that stitches every 3D scene together:
- In the **hangar**, the query picks which ships are posed.
- On the **map**, the query highlights which stations are waypoints.
- On `/trade`, the query picks which routes are recommended (filtering by "ships I own" or "ships under 500k").
- On `/mining`, the query can filter moons by hotspot composition that satisfies an ore target.

Every 3D scene in the site is the *projection of the shared query state into that scene's coordinate space*.

### 5.6 The Orison example, walked through end-to-end

A new user visits `/`. The hangar is full — 80 ships posed at scale. They paste Pedro's question into the search bar:

> *ships with biggest quantum tank that can carry an STV and are buyable at orison*

The NL-bar parses it into three chips:
- `quantum tank ≥ <top-decile> [SP]`  (biggest → top-decile threshold, auto-computed)
- `STV-capable [FY]`
- `buyable @ orison [CS]`

The rail fills with the three chips. `4 MATCH` appears under the rail. The hangar reflows: 76 ships drift up and out over 600ms; the remaining 4 re-pose in-frame.

The user sees (made-up illustrative matches): **Carrack**, **Corsair**, **MSR**, **Constellation Taurus** — posed at scale, with their labels showing quantum tank size in mono under their names because that's the chip whose badge is active.

They press `→` to cycle through the 4 ships. Each detail view shows:
- The ship's quantum tank value with `[SP]` badge next to it.
- The "STV-capable" confirmation with `[FY]` badge.
- The "Buyable at Orison for 1,850,000 aUEC" row with `[CS]` and `[UEX]` badges (CStone for the location, UEX for the current price).

They click **share**. They paste the URL in Spectrum. Anyone opening it sees the same 4-ship hangar pose with the same query rail.

If they then click `map` in the bottom-right nav, the universe map opens with Crusader's Orison station glowing mauve, and the side panel lists all 4 matching ships buyable there, each with `→ fly to ship` back into the hangar.

**That** is the differentiator in action, and nothing else on the SC tool landscape does it.

### 5.7 Interaction budget

Because the query rail is the most complex UI surface in the whole site, here are the hard budgets it must respect:

- **Max visible chips before overflow**: 7. Beyond 7, the leftmost chips collapse into a `+3 more ▾` pill that expands on click. This is the only place where hiding UI is acceptable, because query complexity is user-driven.
- **Parse latency**: the NL bar must show feedback within **50ms** (client-side grammar check) and final chips within **200ms**.
- **Reflow latency**: after a chip change, the hangar must start reflowing within **16ms** and finish within **600ms**. Beyond that the user thinks the site broke.
- **Match count staleness**: the `N MATCH` number must update on every keystroke during NL parsing (optimistic preview), and on every chip toggle in the rail. If it lags the rail it's a bug.
- **Source badge never lies**: if a chip's backing source isn't available right now (offline, rate-limited), the badge shows a small exclamation and the chip's effect is noted as "stale — last refreshed at …". Graceful degradation beats silent wrongness.

---

## 6. Navigation strategy

**No top nav.** No tabs. No sidebar. The chrome of the site is essentially
zero, because the canvas is the chrome.

The user navigates via:

1. **The hangar itself** — scroll/drag to browse, click to inspect, `→`/`←` to flip through ships. This covers ~80% of usage.
2. **Command palette (`⌘K`)** — the only universal navigation primitive. Type to search across every ship, weapon, location, page. Selecting an entry jumps you to it (camera-tweens within the hangar for ships, route-changes for other pages). Modeled on Linear's command bar.
3. **Sub-page route changes** — for `/map`, `/trade`, `/mining`, `/weapons`, `/components`, the user clicks a quiet text link in the bottom-right of the canvas (`map · trade · mining · weapons · components`) — 11px subtext1, no underlines, hover → mauve. **That's the entire menu.** No icons, no labels above 12px.

Mobile: the hangar still works (3D fallback uses fewer ships and a portrait
camera angle). The text-link nav at the bottom-right becomes a horizontally
scrollable strip pinned to the bottom safe-area. No hamburger.

**Decision**: zero top chrome, rely on `⌘K` + bottom text-link strip + canvas-driven browsing. **Committed.**

---

## 7. Typography & spacing system

### Fonts

- **Sans (UI + body)**: **Inter** — variable, with optical sizing on. Same font Linear and Vercel use. Reliable, free, in Google Fonts.
- **Display (h1, ship names)**: **Inter Display** at the same family.
- **Mono (data, codes, IDs)**: **JetBrains Mono** at 13px for data tables, 11px for tooltips. NOT for body text. NOT for headings. Mono is for *numbers and codes only* — a deliberate choice to fight the dense-terminal aesthetic the old site had.

### Type scale

| Role            | Size | Weight | Line-height | Letter-spacing |
| ---             | ---  | ---    | ---         | ---            |
| h1 / hero       | 88px | 700    | 0.95        | -0.02em        |
| h1 / page title | 56px | 700    | 1.0         | -0.015em       |
| h2              | 32px | 600    | 1.15        | -0.01em        |
| h3              | 22px | 600    | 1.2         | -0.005em       |
| h4              | 16px | 600    | 1.3         | 0              |
| body            | 15px | 400    | 1.55        | 0              |
| body-small      | 13px | 400    | 1.5         | 0              |
| label           | 11px | 500    | 1.4         | 0.04em         |
| micro / kbd     | 10px | 500    | 1.4         | 0.06em         |
| mono-data       | 13px | 500    | 1.4         | 0              |

Nothing is 9px. Nothing has tracking above `0.06em`. The old site's
`tracking-[0.18em]` mono uppercase labels are *gone*. They were the visual
signature of the hacker-terminal aesthetic Pedro now hates.

### Spacing scale

`--s-1: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 192`

(Tailwind v4 default scale is fine — these map directly.) Default *gap
between sections* on a page is 96px. Default *padding inside a panel* is
24px. **Both are roughly double what the old site used.** Breathing room is
the whole point.

### Radius

`--r-sm: 4px / --r-md: 8px / --r-lg: 14px`. **No `rounded-full` pills**, no
`rounded-2xl`. Linear's quietness comes partly from sharp-but-not-square
corners. 4–8px everywhere; 14px only on big modals.

### Borders

1px, almost always `border-surface0` (`#313244`). Stronger borders
(`surface1` `#45475a`) only on focused inputs and active filter chips.

---

## 8. Color usage

Catppuccin Mocha. The full role table:

```
--base       #1e1e2e   default page background
--mantle     #181825   panels, raised surfaces
--crust      #11111b   deepest backgrounds (canvas clear color)
--surface0   #313244   borders subtle (default)
--surface1   #45475a   borders strong (focus, active)
--surface2   #585b70   borders strongest (almost never used)
--overlay0   #6c7086   tertiary text, hint text
--overlay1   #7f849c   (avoid — too close to overlay0)
--subtext0   #a6adc8   secondary text
--subtext1   #bac2de   muted body text
--text       #cdd6f4   primary body text
--mauve      #cba6f7   ACCENT — links, active state, primary action,
                       3D scene primary light, focus rings
--sky        #89dceb   secondary accent — info, hover hints,
                       secondary 3D rim light
--peach      #fab387   prices in aUEC, warning states
--green      #a6e3a1   profit / success / "in stock"
--red        #f38ba8   destructive only — never decorative
--yellow     #f9e2af   special: only the Stanton sun (3D map)
--blue       #89b4fa   special: only Nyx system star
```

Rules I'm committing to:

1. Mauve is the accent. **Less than 8% of any screen should be mauve.** It is used for: focus rings, active filter chips, primary buttons, the underline on the active page in `⌘K`, the rim light on the currently-focused 3D ship. Never as a fill color on large surfaces.
2. The 3D scene's primary light is mauve. Its secondary rim is sky. Its fog is `crust`. The hangar floor reflects mauve at low intensity.
3. Prices are peach (not green — green = profit margins on the trade page; peach = static "buy from RSI for X aUEC" prices). This distinction matters because the trade page mixes both.
4. **No gradients** anywhere in the UI. Single exception: a 1px linear-gradient hairline `transparent → mauve(0.5) → transparent` along the top edge of focused panels, fading in over 200ms. (One of the few v4-mockup tricks worth keeping.)
5. **No glows.** No `text-shadow: 0 0 24px mauve` like the old `<h1>` had. The aesthetic is *light, not glow*. Glow is the cheap cousin of light. The 3D scene provides actual light; the DOM doesn't fake it.

---

## 9. Motion & interactions

The DOM is calm. The canvas moves.

### DOM motion

- All transitions: **180ms `cubic-bezier(0.2, 0.8, 0.2, 1)`** unless otherwise specified.
- Hover: color changes only. No scale, no translate. (One exception: the bottom-right text-link nav has a 1px translateY on hover so the user knows it's clickable.)
- Focus: 1px `surface1` border + 2px mauve focus ring (offset 1px). Same rule everywhere.
- Filter chip toggle: background fades over 180ms. Active chip gets a 1px mauve border AND a mauve `surface0`-tinted background.
- Panels appearing: opacity 0 → 1 over 220ms, **no slide, no scale**. Slide-and-fade reads as "fancy"; pure fade reads as "calm". Pedro wants calm.
- Tooltips: 120ms instant fade. They appear on hover after 400ms hover delay.
- No bouncy springs anywhere. No `cubic-bezier(0.34, 1.56, 0.64, 1)`. No "delight" overshoots.

### Canvas motion

- Idle camera drift: a slow 0.06 rad/s sway around the hangar deck centre, so even at rest the scene breathes.
- Camera tween to a ship (on click): **900ms `easeInOutCubic`**. Long enough to feel cinematic, short enough not to annoy.
- Camera tween to neighbour ship (on `→`/`←`): **600ms easeInOutCubic**.
- Filter result reflow: **600ms staggered ease**. Ships leaving fade + drift up, ships staying re-pose into new berths.
- Ship "self-rotation" when hero-posed: **0.08 rad/s** (very slow — a turntable, not a spin).
- 3D scene postprocessing: thin EdgesGeometry overlay on each ship (mauve at 30% opacity) for the unmistakable "spec sketch" look. *No bloom.* Bloom would push us into the tacky 2014 WebGL aesthetic.
- `prefers-reduced-motion: reduce`: idle drift disabled, camera tweens become instant cuts, ship turntable pauses.

### Sound: NO sound. Zero. Pedro has not asked for it; spatial audio is a Bruno-Simon stunt that doesn't fit "calm utility website".

---

## 10. 3D model strategy

**Reality check (per SOURCES.md)**: ship geometry only exists inside the
SC `Data.p4k` archive on a Fedora SC install. There is no public CDN, no
RSI API, no UEX field that gives us `.glb` files. This pipeline is *manual,
slow, and stays manual*:

```
[Fedora SC install] → unp4k → .cgf
    → cgf-converter → .gltf
    → blender (decimate, bake, prune textures) → .glb
    → gltf-pipeline (draco compress) → .glb (final, ~600 KB – 8 MB)
    → scp → Pi:/srv/sc-site/public/ships/{slug}.glb
```

Pedro runs this on his Fedora desktop, on his own time, **one ship at a
time**. No automation. No scheduled refresh. Geometry is stable across
patches; this isn't live data.

**Coverage model**: gradual. Day-1 the site might have 6 ships modelled.
Month 1, maybe 25. Eventually, full catalog. The hangar must look great at
*every* coverage level — including 0% (nothing modelled yet, everything
falls back to placeholder meshes). The mockup.html in this same folder is
literally the "0% coverage" experience: stylised primitive ships, zero
GLBs, and it already feels like the differentiator. **The site does not
require any GLBs to ship.** GLBs are an *upgrade path*, not a dependency.

For each modelled ship Pedro produces three files:

```
apps/web/public/ships/{slug}.glb        full-quality, 1–8 MB (draco)
apps/web/public/ships/{slug}.lod.glb    decimated proxy, 100–400 KB (draco)
apps/web/public/ships/{slug}.thumb.webp 480×270, ~30 KB
```

The proxy mesh is what loads in the hangar overview. The full GLB only
loads when:

1. The user camera-focuses the ship (search hit, click, neighbour skip), OR
2. The ship enters a 1.5×-screen-wide "near zone" during free pan.

Loading is `GLTFLoader` via three.js with `DRACOLoader` enabled. Pi serves
both the meshes and the draco decoder as static files; no API call.

### Fallback when a model is missing (the default state, day 1)

1. **Stylised primitive ship** — the hangar uses the same procedural
   "hull + cockpit + wings + 3 engines + edge overlay" placeholder as
   `mockup.html` does today. It is sized to the ship's real dimensions
   (we have those from UEX `length` / `beam` / `height`) and tinted by
   manufacturer. It does **not** have a "broken" badge. It is the
   intentional, signed look until the GLB arrives. A small `▴ proxy` chip
   in the bottom-right corner of the detail panel acknowledges the proxy
   without screaming about it.
2. When a GLB later replaces a proxy: a 400ms cross-fade in the same
   pose, no jarring jump.
3. The 2D RSI thumbnail still loads in the detail side panel as a
   secondary visual reference.

### IP / hosting policy (non-negotiable)

- The Pi is Tailscale-only. **No GLB is ever served to a public IP.**
- If Pedro ever wants to expose the site publicly, the build pipeline
  must omit the `public/ships/*.glb` directory and force the placeholder
  meshes everywhere. This is enforceable via a build flag
  (`PUBLIC_DEPLOY=1` in env → static-only ship list).
- This rule belongs in the rewritten `CLAUDE.md` once that exists.

### Hangar architecture

Built once at scene init, NOT loaded as a GLB. Pure three.js primitives:

- Floor: `PlaneGeometry(200, 60)` with a `MeshStandardMaterial`,
  metalness 0.85, roughness 0.4. Reflects mauve point lights.
- Pillars: `BoxGeometry(2, 8, 2)` × N along both edges, instanced.
- Ceiling: a single dim plane 12m up with cable grooves (lines).
- Lighting: 3 mauve point lights along the ceiling at 25% intensity, 1 sky
  rim light from the side at 15%, 1 ambient at 10%. Total: very dark, very
  moody.

### Performance budget

- Draw calls: target ≤ 200 in the hangar overview (instanced architecture +
  ~12 ships visible at once).
- Triangles: target ≤ 600k visible at once.
- Texture memory: cap at 256 MB; evict LRU when exceeded.
- Frame time: 16ms desktop, 33ms mobile.

If the GPU can't hit the budget, the engine drops to:
- Disable thin-edge postprocessing.
- Halve the number of point lights.
- Force all ships to LOD proxies.

### Mobile

Portrait camera, only ~3 ships in frame at once, no idle drift, edge
postprocessing disabled. The filter chips stack into a horizontal-scroll
strip. The bottom-right text-link nav wraps the safe area.

---

## 11. What we explicitly DON'T do

A list of anti-patterns I will refuse to add later:

- **No grid of identical ship cards.** The hangar IS the catalog. There is no `<ShipCard>` component anywhere in the codebase.
- **No marketing landing page.** No hero with "Explore the verse", no "Get started", no CTAs. The user lands on the hangar and the hangar is the product.
- **No fake data.** No "Loved by 10,000 pilots", no fake quotes, no fake author names, no testimonials.
- **No glows.** No `text-shadow: 0 0 24px mauve`. Light comes from the 3D scene.
- **No "MISSION CONTROL" / "OPERATIONAL SYSTEMS" / "ONLINE" hacker copy.** No font-mono uppercase labels with `0.18em` tracking. No `STATUS LED`. No `SC.TERMINAL` wordmark. No `⌘ K · STANTON · ONLINE` crowded right cluster.
- **No personal mentions.** No "Pedro", no "tugakit", no "42", no "portfolio", no "made by".
- **No dense data tables without breathing room.** Minimum 12px row padding, 14px font.
- **No skeuomorphism.** No fake bevels, no rivets, no "panel hud" frames, no scan lines, no CRT effects, no `<ScanLines>` component, no `<CursorSpotlight>`. They're cute and they belong in 2014.
- **No gradient text.** Anywhere.
- **No bouncy animations.** No `cubic-bezier(0.34, 1.56, 0.64, 1)`. No spring physics on hover. No "delight overshoots". `cubic-bezier(0.2, 0.8, 0.2, 1)` is the only easing.
- **No top nav, no sidebar, no hamburger, no breadcrumbs.** `⌘K` + the canvas + the 6-link bottom strip is the entire navigation surface.
- **No animated background starfields in the DOM.** The old `<Starfield>` component is gone. The 3D scene has its own stars; the DOM doesn't compete.
- **No "system selector pill" or "online status LED".** They were noise.
- **No `font-mono` for body text.** Mono is for numbers and codes only.
- **No infinite scroll.** The hangar contains every ship (~60-100). It is a finite room.
- **No tooltips on everything.** Tooltips only on icons and abbreviations.
- **No hover-revealed information.** If it matters, it's visible by default.
- **No "loading spinners".** Use a static "loading" label and let the canvas idle behind it.
- **No modal dialogs.** Side-panels-over-canvas only.
- **No light theme.** Catppuccin Mocha is the only theme.

---

## Appendix A — what we keep from the old site

Read for posterity. Things from `sc-site-old` worth porting:

- The `UniverseMap.tsx` 3D scene logic (planet wireframes, sun palette per system, jump-point dashed lines) is solid; only its DOM chrome (mono breadcrumb, glow text-shadow `<h1>`, "drag to orbit · scroll to zoom" mono hint) needs replacing.
- The `ShipViewer3D.tsx` cleanup logic (frame loop, dispose pattern, mousemove parallax) is a good template — but the cube wireframe ship gets thrown out in favour of real GLBs.
- The Catppuccin CSS variables in `globals.css` — keep wholesale.
- That's it. No components survive. The visual signature of `TopNav.tsx`, `ShipCard.tsx`, `Sidebar.tsx`, `FilterBar.tsx`, `Starfield.tsx`, `ScanLines.tsx`, `CursorSpotlight.tsx`, `StatusLED.tsx` is exactly the dense-terminal vibe we are running away from.

## Appendix B — questions for data-sources / ingestion teammates

Read after `SOURCES.md`:

- **Ship dimensions**: confirm UEX (or whichever source survives the merge) exposes `length`, `beam`, `height` in metres for *every* ship. The hangar's whole "real relative scale" reading depends on this. If dimensions are missing for some ships, the placeholder defaults to the median size — visually wrong but not broken.
- **Manufacturer accent colours**: I'd like a manufacturer → tint mapping (Drake = brutalist mauve, Origin = cream, Anvil = sky-blue, MISC = sky-green) so placeholder ships look distinct. Either the catalog data has a `manufacturer_color`, or we hand-author it once in the UI repo.
- **Trade margins**: confirm the current/historical pricing endpoint that lets us compute buy/sell deltas — the `/trade` page assumes we can compute margins server-side and stream them in.
- **Mining hotspot composition**: confirm we can tie composition records to a moon ID, so the mining page's right-hand 3D moon viewer can colour-code hotspots correctly.
- **Image rights**: SOURCES.md says only RSI's `media.robertsspaceindustries.com` URLs work in browsers (CORS). Confirm the slug→image-URL mapping is stable so the detail-panel thumbnails don't 404.
- **Loadout / hardpoint coordinates**: for the future loadout editor, confirm we can locate hardpoints in 3D model space (not just by name). If hardpoint coordinates aren't in any data source, we'll have to author them by hand on top of each GLB.

## Appendix C — stretch: The People's Radio easter egg

Pedro's seed list flagged **The People's Radio** (`thepeoplesradio.space`) as a potential easter egg: in-lore fan webradio that could play softly while the user browses the hangar. **I'm including it as an explicit non-goal for v1** but worth keeping in mind:

- Default **off**. Nothing auto-plays. No autoplay = no Chrome policy violations and no hostile first-load experience.
- A tiny speaker icon in the bottom-right of the canvas (same row as the text nav, muted `overlay0`) toggles it on. Volume starts at 15%. Mauve 1px ring when active.
- It is a **single audio element** pointing at the TPR livestream URL — no custom player, no visualiser. Zero chrome.
- Gated behind `prefers-reduced-motion: no-preference` AND explicit user click, because it's a surprise, not a feature.

This belongs AFTER the hangar is polished, the query rail is working, and the universe map is integrated. It is the last 1% of delight, not load-bearing.

---

## Sources

Design references and competitive analysis sourced during research:

- [Best Three.js Portfolio Examples (2026) — CreativeDevJobs](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025)
- [How we redesigned the Linear UI (part II) — Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [A calmer interface for a product in motion — Linear](https://linear.app/now/behind-the-latest-design-refresh)
- [StarShip42 FleetView — A 3D Fleet Viewer — RSI Community Hub](https://robertsspaceindustries.com/community-hub/post/star-ship42-fleet-view-a-3-d-fleet-viewer-ew669zuuvno4m)
- [StarShip42 Compare — RSI Community Hub](https://robertsspaceindustries.com/community-hub/post/star-ship42-compare-an-app-to-compare-ship-models-kwv6aej73wjdn)
- [myfleet.gg — Free 3D Fleet Viewer / StarShip42 Successor](https://myfleet.gg/)
- [StarJump Fleet Viewer — Dutch Demons tool profile](https://dutchdemons.com/tool/starjump-fleetviewer/)
- [Star Citizen Holoviewer (starcitizen-community.de, v6.0, 328 vehicles)](https://robertsspaceindustries.com/community-hub/post/the-star-citizen-holoviewer-is-back-v6-0-open-xr-fHfV4r2CCMzS7)
- [VerseGuide (3D POI navigation for SC)](https://verseguide.com)
- [Regolith (mineral spawn zones reference)](https://regolith.rocks/)
- [SnarePlan (quantum route arc modeling)](https://snareplan.dolus.eu/)
- [The People's Radio (in-lore fan webradio, easter egg candidate)](https://thepeoplesradio.space/)
