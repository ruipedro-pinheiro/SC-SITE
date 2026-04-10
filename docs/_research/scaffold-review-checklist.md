# Scaffold Review Checklist

> Compiled from `docs/MOCKUP.md`, `docs/mockups/tokens.css`,
> `docs/mockups/hangar.html`, and `docs/mockups/ship-detail.html`.
> The `monorepo-scaffold` agent's output must satisfy every box below.
> Each box is binary (pass/fail). The reviewer agent runs through this
> top-to-bottom and refuses to land the scaffold if anything is open.

---

## 1. Tokens (tokens.css / Tailwind v4 `@theme` block)

The tokens MUST live at `packages/ui/src/styles/tokens.css` and be
imported by `apps/web/app/globals.css`. The `@theme` block is the
production form of the canonical `:root` block in
`docs/mockups/tokens.css`.

### Color (Catppuccin Mocha — full palette, every entry)
- [ ] `--color-base       #1e1e2e`
- [ ] `--color-mantle     #181825`
- [ ] `--color-crust      #11111b`
- [ ] `--color-surface0   #313244`
- [ ] `--color-surface1   #45475a`
- [ ] `--color-surface2   #585b70`
- [ ] `--color-overlay0   #6c7086`
- [ ] `--color-overlay1   #7f849c`
- [ ] `--color-overlay2   #9399b2`
- [ ] `--color-subtext0   #a6adc8`
- [ ] `--color-subtext1   #bac2de`
- [ ] `--color-text       #cdd6f4`
- [ ] `--color-rosewater  #f5e0dc`
- [ ] `--color-flamingo   #f2cdcd`
- [ ] `--color-pink       #f5c2e7`
- [ ] `--color-mauve      #cba6f7`  (the only "primary accent")
- [ ] `--color-red        #f38ba8`  (destructive only)
- [ ] `--color-maroon     #eba0ac`
- [ ] `--color-peach      #fab387`  (aUEC prices, warning)
- [ ] `--color-yellow     #f9e2af`  (Stanton sun only)
- [ ] `--color-green      #a6e3a1`  (profit / "in stock")
- [ ] `--color-teal       #94e2d5`
- [ ] `--color-sky        #89dceb`  (secondary accent)
- [ ] `--color-sapphire   #74c7ec`
- [ ] `--color-blue       #89b4fa`  (Nyx star only)
- [ ] `--color-lavender   #b4befe`
- [ ] Semantic border roles present: `--color-border-default` →
      surface0, `--color-border-hover` → surface1,
      `--color-border-focus` → mauve.

### Typography family tokens
- [ ] `--font-sans` → `'Inter', ui-sans-serif, system-ui, …`
- [ ] `--font-mono` → `'JetBrains Mono', ui-monospace, …`
- [ ] `--font-display` → `'Orbitron', 'Inter', …` (Orbitron is **kept**;
      Pedro approved it. Do not silently swap to "Inter Display".)
- [ ] Fonts loaded via `next/font` in `apps/web/app/layout.tsx`, not via
      a CDN `<link>`.

### Type-scale tokens
- [ ] Every step from §7 present as a CSS var:
      `--text-10 / 11 / 12 / 13 / 14 / 15 / 16 / 18 / 22 / 28 / 32 / 40
      / 48 / 56 / 72 / 88`.
- [ ] Weights: `--weight-regular 400`, `--weight-medium 500`,
      `--weight-semibold 600`, `--weight-bold 700`.
- [ ] Line-heights: `--leading-tight 0.95`, `--leading-snug 1.15`,
      `--leading-normal 1.4`, `--leading-body 1.55`.
- [ ] Tracking: `--tracking-tight -0.02em`, `--tracking-normal 0`,
      `--tracking-label 0.04em`, `--tracking-micro 0.06em`.
      **NOTHING above 0.06em anywhere.**

### Spacing scale (4 px base)
- [ ] Steps: `--space-0 / 1 / 2 / 3 / 4 / 5 / 6 / 8 / 10 / 12 / 16 / 20
      / 24 / 32 / 48 / 64 / 96` (= 0, 4, 8, 12, 16, 20, 24, 32, 40, 48,
      64, 80, 96, 128, 192, 256, 384 px).
- [ ] Default panel padding `--space-6` (24 px).
- [ ] Default section gap `--space-24` (96 px).

### Radii
- [ ] `--radius-sm 2px / --radius-md 4px / --radius-lg 6px /
      --radius-xl 8px / --radius-2xl 14px`.
- [ ] No `rounded-full` utility in use anywhere except the 4 px source
      dot in the query rail (`.src-dot`, see §6 below).

### Borders
- [ ] `--border-hairline 1px`, `--border-1 1px`, `--border-2 2px`.
- [ ] `--hairline-gradient` defined as
      `linear-gradient(90deg, transparent, rgba(203,166,247,0.55),
      transparent)`. This is the **only** gradient allowed in the DOM
      per §8 rule 4.
- [ ] A `.panel-hairline` utility class exists (or its `@layer
      components` equivalent) consuming `--hairline-gradient`. Used at
      the top edge of focused panels.

### Motion
- [ ] `--ease-deliberate: cubic-bezier(0.2, 0.8, 0.2, 1)` — the only
      easing token.
- [ ] Duration tokens: `--duration-120 / 180 / 200 / 220 / 400 / 600 /
      900` (ms). All six are used somewhere or reserved for the §9
      surface they belong to.
- [ ] No bouncy / overshoot easings (`cubic-bezier(0.34, 1.56, …)` or
      similar) anywhere in the codebase.

### Layout constants
- [ ] `--width-search 520px`
- [ ] `--width-history-drawer 360px`
- [ ] `--width-popover 300px`
- [ ] `--height-chip 28px`
- [ ] `--height-top-bar 64px`

### Z-index ladder
- [ ] `--z-canvas 0 / --z-overlay 10 / --z-labels 20 / --z-chrome 30 /
      --z-panel 40 / --z-popover 50`.

---

## 2. Typography usage (per MOCKUP.md §7)

- [ ] **Ship names** (the `CARRACK` h1 in identity panel, the
      `.ship-label .name` over the canvas) use `font-display` =
      Orbitron.
- [ ] **Numeric values** (every `.row .v`, dimensions row, MSRP, SCU,
      hardpoint DPS, history version strings, dates, damage-resistance
      numeric column, hangar `4 MATCH` count) use `font-mono` =
      JetBrains Mono.
- [ ] **Body / labels** (paragraphs, hint copy, chip labels, link
      text, role labels) use `font-sans` = Inter. **Inter is the
      default.**
- [ ] No `font-mono` on body text or headings — mono is for numbers
      and codes ONLY (§7 explicit, §11 ban).
- [ ] Type scale matches §7 exactly:
      - h1 / hero       88 px / 700 / lh 0.95 / tracking -0.02em
      - h1 / page title 56 px / 700 / lh 1.0  / tracking -0.015em
      - h2              32 px / 600 / lh 1.15 / tracking -0.01em
      - h3              22 px / 600 / lh 1.2  / tracking -0.005em
      - h4              16 px / 600 / lh 1.3  / tracking 0
      - body            15 px / 400 / lh 1.55 / tracking 0
      - body-small      13 px / 400 / lh 1.5  / tracking 0
      - label           11 px / 500 / lh 1.4  / tracking 0.04em
      - micro / kbd     10 px / 500 / lh 1.4  / tracking 0.06em
      - mono-data       13 px / 500 / lh 1.4  / tracking 0
- [ ] Ship name in the identity panel renders at **28 px** (per the
      mockup, smaller than the 48 px banner — it sits inside a panel,
      not as a hero).
- [ ] Nothing is 9 px. Nothing tracks above 0.06em. The old site's
      `tracking-[0.18em]` mono uppercase labels are absent from the
      whole codebase.

---

## 3. Color usage (per MOCKUP.md §8)

- [ ] `<body>` background is `--color-base` (#1e1e2e), NOT crust.
- [ ] `<html>` background is `--color-crust` so the WebGL canvas
      clears to a colour that disappears into the page edges (matches
      `tokens.css` lines 273-284).
- [ ] Three.js renderer `setClearColor` uses `#11111b` (crust).
- [ ] Mauve `#cba6f7` is the primary accent — focus rings, active
      chip border + 6%-tinted fill, focused link colour, scene
      primary point lights.
- [ ] **Less than 8 % of any screen surface is mauve.** Reviewer
      eyeballs the rendered hangar + ship-detail and rejects if mauve
      reads as a fill colour rather than an accent.
- [ ] Sky `#89dceb` is the secondary accent — info, hover hints,
      secondary 3D rim light, "above-mean" damage-resistance bar
      inner border.
- [ ] Peach `#fab387` is reserved for aUEC prices, warning states,
      and "below-mean" damage-resistance bar inner border. **NEVER
      green for prices.** Green is profit on the trade page only.
- [ ] **No red or green as decorative / "alarmist" data-viz fills.**
      Damage-resistance bars are mauve at 55 % alpha against a
      surface0 track — never red-for-bad or green-for-good.
- [ ] Banned hexes: search the entire repo for `#00d9ff` and `#ff0080`
      — both must return zero matches.
- [ ] **No glows.** No `text-shadow`, no `box-shadow` halo on
      hardpoint dots, no `box-shadow` glow on chips, no
      `emissiveIntensity > 0` on three.js materials in the scaffold's
      placeholder code, no CSS `filter: drop-shadow` for accent
      effect. The `.dr-fill.accent-sky / .accent-peach` `box-shadow:
      inset 0 0 0 1px …` is the only `box-shadow` that may exist —
      and only as a 1 px inset border, not a halo.
- [ ] **No gradients** anywhere except the `--hairline-gradient`
      single allowed instance. Search for `linear-gradient` and
      `radial-gradient` in CSS / .tsx and confirm only the hairline
      gradient appears.
- [ ] No `bg-gradient-to-*` Tailwind utility anywhere.
- [ ] No gradient text. No `background-clip: text`.

---

## 4. Motion (per MOCKUP.md §9)

- [ ] Every CSS `transition` and three.js tween uses
      `--ease-deliberate` / `cubic-bezier(0.2, 0.8, 0.2, 1)`. No
      exceptions.
- [ ] DOM hover transitions are **color only** — no `scale`,
      `translate`, `rotate` on hover (one allowed exception: the
      bottom-right text-link nav may have a 1 px translateY).
- [ ] Default transition duration is **180 ms**.
- [ ] Panel fade-in (the `.panel.is-focused` state) uses opacity
      0 → 1 over **220 ms**. No slide, no scale.
- [ ] Hairline gradient fade is **200 ms** (`--duration-200`).
- [ ] Tooltip fade is **120 ms** with a **400 ms hover delay**.
- [ ] Filter result reflow uses **600 ms staggered ease**.
- [ ] Camera neighbour-skip uses **600 ms** `easeInOutCubic`.
- [ ] Camera dolly-in to a hero ship uses **900 ms** `easeInOutCubic`.
- [ ] Idle hangar camera drift is a **0.06 rad/s** sway around the
      deck centre (the `frame()` loop in `hangar.html` line 544
      uses `Math.sin(t * 0.06) * 0.04`). The placeholder canvas
      component must either honour this number or document it
      as the value the real canvas will land on.
- [ ] Hero-posed ship self-rotation is **0.08 rad/s**, **only when a
      ship is hero-posed**. Wide overview ships are static.
- [ ] `prefers-reduced-motion: reduce` disables idle drift, makes
      camera tweens instant cuts, pauses the hero turntable. The
      scaffold's placeholder canvas already honours
      `window.matchMedia('(prefers-reduced-motion: reduce)')`.

---

## 5. Ban list (per MOCKUP.md §11 + CLAUDE.md hard constraints)

### Marketing / chrome / copy
- [ ] No marketing landing page anywhere. `/` redirects to `/ships`.
      `/ships` IS the hangar; no hero, no "Welcome to", no "Explore
      the verse", no CTAs.
- [ ] No "Sign in", "Launch", "Get started", "Try it", "Join the
      beta", or any other CTA copy.
- [ ] No "Loved by N pilots", no fake testimonials, no fake quotes,
      no fake author names.
- [ ] No personal mentions: grep for `pedro`, `42`, `tugakit`,
      `portfolio`, `made by` in `apps/web/**` and `packages/ui/**` →
      zero hits in user-facing copy. Code comments are fine.
- [ ] No emojis in any UI copy. Search `apps/web/app/**/*.tsx` and
      `packages/ui/src/**/*.tsx` for `🚀 🛸 🔎 📍 💰 ⭐` and friends —
      none in JSX text. (Code comments are tolerated.)
- [ ] No banned vocabulary anywhere in `apps/web/**` or
      `packages/ui/**` JSX/MDX strings: `powerful`, `revolutionary`,
      `next-gen`, `unleash`, `unlock`, `seamlessly`, `world-class`,
      `blazing fast`, `effortlessly`, `game-changing`. Reviewer
      runs grep, refuses on any hit.
- [ ] No "MISSION CONTROL", "OPERATIONAL SYSTEMS", "ONLINE", "STATUS
      LED", "SC.TERMINAL", "STANTON · ONLINE" hacker copy.
- [ ] No `font-mono uppercase tracking-[0.18em]` anywhere. Grep for
      `tracking-[0.18em]` and `tracking-[0.1em]` → zero.

### Visual chrome
- [ ] No `<ScanLines>` component. No CRT scanline overlay. No
      `<CursorSpotlight>`. No `<Starfield>` DOM dots.
- [ ] No animated DOM background of any kind — the canvas is the
      atmosphere.
- [ ] No skeuomorphic bevels, rivets, "panel hud" frames, fake
      brushed-metal textures.
- [ ] No light theme. Only Catppuccin Mocha.

### Interaction patterns
- [ ] **No modal dialogs.** Side panels and slide-in sheets only. If
      shadcn primitives end up in `packages/ui/src/components/ui/`,
      `Dialog` is **not** imported by any sc-site composed component.
      Prefer `Sheet` (drawer) for slide-in.
- [ ] **No floating tooltips on everything.** No native `title=""`
      for hardpoint mounts or stat rows. The hairline-callout pattern
      from `ship-detail.html` lines 114-144 is the only allowed
      "hover info" affordance for hardpoints.
- [ ] No top nav, no sidebar, no hamburger, no breadcrumbs.
- [ ] No infinite scroll anywhere.
- [ ] No loading spinners. Static "loading" labels only.
- [ ] No bouncy animations / spring physics / overshoots.

### Data viz
- [ ] No `<ShipCard>` component. The hangar is the catalog. Grep
      `apps/web/**` and `packages/ui/**` for `ShipCard` — zero hits.
- [ ] No grid of identical ship cards rendered server-side as a
      fallback "in case three.js doesn't load" — the
      `ThreeCanvasPlaceholder` is the fallback, not a card grid.

---

## 6. Page specs (per MOCKUP.md §4)

### `/` → redirects to `/ships`
- [ ] `apps/web/app/page.tsx` is a single-line redirect to `/ships`.
- [ ] No content rendered at `/` itself. No marketing copy. No
      "loading…" splash.

### `/ships` — hangar entry
- [ ] Page is a full-bleed canvas. The `<ThreeCanvasPlaceholder />`
      div is positioned `fixed inset-0` with `z-index: 0` and labelled
      somewhere visible (a single 11 px `overlay0` line, e.g.
      `three.js mount point — placeholder until §10 lands`) so the
      reviewer can confirm it is intentionally a placeholder and not
      missing chrome.
- [ ] The placeholder uses **two soft radial washes** in mauve
      (matches CLAUDE.md "soft radial washes" note) — and only those
      two washes. No card grid, no "explore the verse" copy, no demo
      ship list rendered as DOM.
- [ ] Top-centre **search bar**: 520 px wide (`--width-search`),
      `var(--height-top-bar)` offset from the top, dual-mode
      placeholder text exactly:
      `ship name, or: quantum tank ≥ 50k, STV-capable, buy @ orison`
      Background `bg-mantle/70` + `backdrop-blur-md`, `border-surface0`,
      `rounded-md`, focus → `border-surface1`. The
      `.panel-hairline` sits at the bottom edge of the input
      (= top edge of the future NL preview surface).
- [ ] Top-right **`jump to [⌘ K]`** hint, 11 px `overlay0`,
      `tracking-micro`, with the kbd block.
- [ ] **Query rail** sits 12 px below the search bar:
      - 4 source-badged demo chips matching the canonical example:
        - `[SP] quantum tank ≥ 50k` (peach src-dot)
        - `[FY] STV-capable` (sky src-dot)
        - `[CS] buyable @ orison` (green src-dot)
        - `[UEX] ≤ 2.5M aUEC` (mauve src-dot)
      - Each chip: 28 px tall (`--height-chip`), 12 px horizontal
        padding, 1 px `border-mauve/50`, `bg-mauve/[0.06]`,
        `rounded-md`. Active state matches `hangar.html` lines
        164-193.
      - Each chip carries a 4 px coloured `.src-dot` + 2-letter source
        badge (`SP`, `FY`, `CS`, `UEX`) in `text-10 font-mono
        text-overlay0`.
      - `+ add` button after the chips, 28 px tall, `border-surface0`,
        hover → `border-surface1`. Solid border (NOT dashed —
        `hangar.html` lines 195-202).
      - `save` and `share` icon buttons immediately after `+ add`,
        14 × 14 px inline SVG, `text-subtext0`, hover → `text-mauve`.
- [ ] **Match count** below the rail, right-aligned area:
      `<bold>4</bold> MATCH` in `text-10 tracking-micro text-subtext0`.
- [ ] **Bottom-left hint**, exact text (`hangar.html` line 246):
      `4 OF 6 SHIPS MATCH · DRAG TO PAN · SCROLL TO DOLLY · CLICK TO
      INSPECT`. 10 px `tracking-micro text-overlay0`.
- [ ] **Bottom-right text nav**, the entire menu, links:
      `hangar · map · trade · mining · weapons · components`. 12 px
      `text-subtext0`, active link `text-mauve`. No icons. The
      `hangar` link is the active state on `/ships`.
- [ ] No "save query / share query" text labels visible — the icons
      stand alone with `title` attributes (only place `title=""` is
      tolerated, since these are icons not data fields).
- [ ] No marketing landing content of ANY kind on `/ships`.
- [ ] No DOM starfield, no animated background, no scanlines.

### `/ships/[slug]` — ship detail (use `carrack` as the demo slug)
- [ ] Page is a full-bleed canvas (same `<ThreeCanvasPlaceholder />`
      pattern as `/ships`, optionally with a different label such as
      `three.js hero pose — placeholder`).
- [ ] Panels float **OVER** the canvas via `position: fixed` +
      `backdrop-blur-md`. Three panels total + history drawer +
      hardpoint markers + bottom prev/next row + bottom-right nav.
- [ ] **Top-left: `← back to hangar`** link (`top-10 left-10`,
      12 px `text-subtext0`, hover → `text-mauve`).
- [ ] **Top-right `jump to [⌘ K]`** hint identical to the hangar.
- [ ] **IDENTITY panel** — top-left, 320 px wide,
      `top: 96px / left-10`, `z-index: 40`, applies the `.panel`
      treatment (mantle/72, blur 12px, surface0 1 px border,
      radius-lg, padding-6, top-edge `.panel-hairline`):
      - Manufacturer line (`Anvil Aerospace`) in 10 px
        `tracking-micro text-overlay0 uppercase`.
      - Ship name `CARRACK` as `<h1 class="font-display">` at 28 px,
        `font-semibold`, `leading-none`, `letter-spacing: -0.01em`.
      - Role line `exploration · large` in 11 px
        `tracking-label text-subtext0 uppercase`.
      - Dimensions row in mono 11 px: `L 126.5 m · B 76.5 m ·
        H 29.5 m · M 4 600 t`.
      - Then a 1 px `surface0` divider.
      - Five `.row` data rows (k / v / src): `SCU 456 [WK]`, `crew
        5 + 1 gunner [UEX]`, `MSRP 2 350 000 aUEC [UEX]` (peach
        value), `buy @ Orison 2 350 000 [CS]` (peach value),
        `pledge $600 [RSI]`.
      - Trailing store URL link `robertsspaceindustries.com ↗` in
        11 px `text-subtext0`, hover → `text-mauve`.
- [ ] **LOGISTICS panel** — bottom-left, 320 px wide,
      `bottom: 64px / left-10`, `z-index: 40`, `.panel`. Header line
      `logistics` in 10 px `tracking-micro overlay0 uppercase`. Rows:
      `cargo grid 456 SCU [WK]`, `crew 1 – 6 [UEX]`, `quantum range
      63.6 Gm [SP]`, `quantum fuel 8 100 µSCU [SP]`, `hydrogen tank
      198 000 L [SP]`, `tractor range 35 m [ER]`, `vehicle bay
      Ursa / PTV [FY]`. **NOT a loadout browser.**
- [ ] **COMBAT panel** — bottom-right slot, 320 px wide,
      `bottom: 64px`, `right: calc(var(--width-history-drawer) +
      56px)`, `z-index: 40`, `.panel`. Header line `combat` in
      10 px `tracking-micro overlay0 uppercase`. Rows:
      `shield HP 552 000 [ER]`, `hull HP (fwd) 18 750 [ER]`,
      `pilot guns 2 × S3 chin [ER]`, `nose turrets 2 × S4 remote
      [ER]`, `dorsal turret 1 × S5 manned [ER]`, `belly turret
      1 × S5 remote [ER]`, `missiles 1 × S4 rack [ER]`.
- [ ] **DAMAGE RESISTANCE strip** — sub-section inside the combat
      panel, separated from the row stack by a 1 px `surface0`
      hairline + 16 px padding. Header `damage resistance` in
      10 px `tracking-micro overlay0 uppercase`. Five rows in this
      exact order: `Physical · Distortion · Energy · Thermal ·
      Biochem`. Each row is a 3-column grid `72px 1fr 44px`:
      label / `.dr-track` / numeric value.
      - Track is 8 px tall, `surface0` background.
      - Fill is `rgba(203,166,247,0.55)` (mauve at 55 % alpha).
      - Fill width proportional to `1 / aggregated_multiplier` so
        long bar = best resistance.
      - The two **highest** rows get `.accent-sky` (1 px inset sky
        border).
      - The two **lowest** rows get `.accent-peach` (1 px inset peach
        border).
      - Numeric column right-aligned in 11 px `font-mono text-subtext0`.
- [ ] **HISTORY drawer** — flush against the right edge of the
      canvas, `width: var(--width-history-drawer)` (= 360 px), no
      right border, top/bottom-right radius zeroed so it merges with
      the viewport edge. Renders **both states** for the reviewer
      (matches `ship-detail.html` (a)+(b) two-aside trick):
      - **Collapsed trigger** at `top: 96px`, `z-index: 39`. Single
        button row: `history · 12 changes across 4 patches    ▾`.
        13 px `subtext1` for the word `history`, 12 px `overlay0`
        for the count, the `·` separator in 12 px `overlay0`.
      - **Expanded drawer** at `bottom: 64px`, `z-index: 38`. Header
        same line + `▴` collapse arrow. **Category filter chips row**
        (24 px tall, query-rail style): `combat · mobility · economy
        · cosmetic`. Three of four are active (mauve border + 6 %
        fill), `cosmetic` inactive (`border-surface0
        text-subtext0`).
      - Three demo `.hist-row` patch entries with mono version
        string, body delta line in 12 px `subtext0`, mono date
        right-aligned. Use the version strings + dates from
        `ship-detail.html` lines 575-600.
- [ ] **Prev / next ship cycle row** at bottom-centre, `bottom:
      24px`, `z-index: 30`, exactly:
      `← prev (MSR) · ESC to close · next (CONSTELLATION) →`.
      11 px `text-subtext0`, the `·` in `text-overlay0`. Prev and
      next are anchor links, `ESC to close` is plain text.
- [ ] **Bottom-right text nav restored** at `bottom: 24px`,
      `right: calc(var(--width-history-drawer) + 24px)`, three links
      only (collapsed because the corner is tight): `hangar · map ·
      [⌘ K] more`. The `more` chord uses the kbd block.
- [ ] **Hardpoint markers**: 7 dots positioned in a fixed `<div>`
      layered over the canvas at `z-index: 20`, matching the canonical
      Carrack hardpoint set:
      - `2 × S4 nose` (manned remote)
      - `1 × S5 dorsal` (manned turret) — this dot uses the
        `.is-hovered` class so the static callout demo works
      - `1 × S5 belly` (remote turret) — `.muted`
      - `1 × S4 missile rack` — `.muted`
      - `2 × S3 chin pilot guns` (NOT wing — Carrack has no wing
        mounts)
      - The combat panel rows MUST agree field-for-field with this
        hardpoint set.
- [ ] Each `.hp-dot` is exactly **6 px square**, `border-radius:
      9999px`, `background: rgba(203,166,247,0.70)`, no `box-shadow`,
      no `transform: scale()` on hover. Hover changes alpha
      (0.7 → 1.0) ONLY. `.muted` variant uses
      `rgba(166,173,200,0.30)`.
- [ ] **Hardpoint hover tooltip**: the inline `.hp-callout` pattern
      from `ship-detail.html` lines 114-144 — leader hairline (uses
      `--hairline-gradient`) + `.body` block (mantle 78 % +
      backdrop-blur, surface0 border, radius-md, top-edge hairline).
      Body content: `S5 · dorsal manned` in 10 px
      `tracking-micro overlay0 uppercase`, then `Behring M7A` in
      mono-13 `text`, then `DPS 1 540 [ER]` in mono-11 with
      `overlay0` labels. **No native `title=""` attribute on any
      hardpoint dot.**
- [ ] **No credit line** `model: maps.adi.sc` anywhere on the page
      (the previous mockup had this — it's gone).
- [ ] **No combat-panel tabs** `combat / mobility / dimensions /
      economy`. The combat panel is a single unified card. These tab
      strips were in earlier mockups and are NOT in §4 — they must be
      absent.
- [ ] **No `loadout` browser** anywhere on the detail page. Loadout
      lives in the future `/loadout/[slug]` page.

---

## 7. Modularity (Pedro's hard requirement)

- [ ] All sc-site composed components live in `packages/ui/src/sc/`.
      Reviewer enumerates the directory and confirms components like
      `ThreeCanvasPlaceholder`, `SearchBar`, `QueryRail`, `Chip`,
      `IdentityPanel`, `LogisticsPanel`, `CombatPanel`,
      `DamageResistanceStrip`, `HistoryDrawer`, `HardpointMarker`,
      `HardpointCallout`, `BottomNav`, `PrevNextRow` (exact names
      flexible — but the pattern: **one component per concern**)
      live there.
- [ ] If shadcn primitives are pulled in, they live in
      `packages/ui/src/components/ui/` (NOT `apps/web/components/`),
      and only as building blocks for the `sc/` layer.
- [ ] The `@sc-site/ui` package exposes a barrel `index.ts` that
      re-exports every component the apps import.
- [ ] `apps/web/app/(catalog)/ships/page.tsx` and
      `apps/web/app/(catalog)/ships/[slug]/page.tsx` import their
      visual components from `@sc-site/ui` — **no JSX duplicating
      panel / chip / row markup inside the route files.** Route files
      are thin compositions: data fetch + layout + component imports.
- [ ] Editing one component file (e.g. `Chip.tsx`) propagates to
      every page using it. Reviewer does a manual touch test:
      change `Chip` text colour → confirm both `/ships` rail chips
      and `/ships/carrack` history-drawer category chips update.
- [ ] HMR is verified: editing a `.tsx` in `packages/ui/src/sc/`
      hot-reloads the app at `http://100.105.42.81:3000` in roughly
      200 ms (no full page refresh).
- [ ] Mock data lives in `apps/web/lib/mock-data.ts` (per CLAUDE.md
      repo layout). Components consume props, not hardcoded strings —
      the only strings hardcoded inside components are labels /
      static UI copy, NOT ship data.

---

## 8. Dev server accessibility

- [ ] `bun run dev` (from `/home/pedro/sc-site`) starts Next.js on
      port **3000** without errors.
- [ ] The dev server is bound to `0.0.0.0` (the script is
      `next dev --hostname 0.0.0.0 --port 3000` per CLAUDE.md).
- [ ] Pedro's Fedora desktop reaches the site at
      `http://100.105.42.81:3000/ships` over Tailscale. Reviewer
      confirms with a `curl -I http://100.105.42.81:3000/ships` from
      a non-Pi context (or asks Pedro to verify).
- [ ] Hot Module Reload works. Editing `apps/web/app/page.tsx` or
      any file under `packages/ui/src/**` triggers a hot update in
      ~200 ms. Reviewer touches one file and watches the browser.
- [ ] The Bun workspace links `@sc-site/ui` correctly — the apps
      see live source from `packages/ui/src/`, NOT a stale prebuilt
      `dist/`. (No `tsup` / `unbuild` step for `@sc-site/ui` that
      would break HMR.)

---

## 9. Strict TypeScript + Biome

- [ ] `bun run check` returns **zero** Biome warnings AND zero
      errors. (Biome 1.9, config at `/home/pedro/sc-site/biome.json`.)
- [ ] `bun run typecheck` (or equivalent `tsc --noEmit` across
      workspaces) returns **zero** TypeScript errors.
- [ ] `tsconfig.base.json` sets all of:
      - `"strict": true`
      - `"noUncheckedIndexedAccess": true`
      - `"exactOptionalPropertyTypes": true`
      - `"noImplicitOverride": true` (recommended)
      - `"noFallthroughCasesInSwitch": true` (recommended)
- [ ] Zero `any` types in `apps/web/**` or `packages/ui/**`. Grep
      for `: any` and `as any` → zero hits in `.ts` / `.tsx`.
- [ ] Zero unused imports. Biome enforces, but the reviewer
      double-checks by running the lint pass.
- [ ] Zero `console.log` calls in committed code. Grep `console\.`
      → zero hits in `apps/web/**` and `packages/ui/**`.
- [ ] Zero `// @ts-ignore` / `// @ts-expect-error` / `// eslint-
      disable` / `// biome-ignore` comments without an explanation.
      Reviewer rejects "drive-by suppression".
- [ ] No `next.config.*` `typescript.ignoreBuildErrors: true` or
      `eslint.ignoreDuringBuilds: true`. Both must be absent or
      explicitly `false`.
- [ ] Biome `formatter` and `linter` are both enabled, with
      `recommended` rule set ON.

---

## Sign-off

The reviewer reads through every box. Each unchecked box is a blocker.
The scaffold lands when **all** boxes pass; partial landings are
explicitly forbidden by Pedro's `feedback_no_half_measures.md`.

If any item is ambiguous in MOCKUP.md, fall back to the
canonical mockup HTML (`docs/mockups/hangar.html`,
`docs/mockups/ship-detail.html`) — they are post-fix and
authoritative.
