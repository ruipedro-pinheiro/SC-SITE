# sc-site — agent context

> Read this file before touching any source. Pair with `docs/MOCKUP.md` for
> the visual + interaction spec.

## What this is

A Star Citizen ship catalog rendered as a 3D hangar bay. The big-bet
differentiator: a cross-source query rail (UEX + SPViewer + erkul + CStone
+ FleetYards + wiki) physicalised as a reflowing 3D scene. No grid of cards.
No marketing landing page. The hangar IS the catalog.

## Stack (locked — do not propose alternatives)

- **Runtime**: Bun 1.3.x at `/home/pedro/.bun/bin/bun`
- **Monorepo**: Bun workspaces (`apps/*`, `packages/*`)
- **Framework**: Next.js 15 App Router
- **Language**: TypeScript with strict + noUncheckedIndexedAccess +
  exactOptionalPropertyTypes
- **Styling**: Tailwind CSS v4 (the `@theme` block, NOT v3 JS config)
- **Component shape**: hand-rolled sc-site components in `packages/ui/src/sc/`,
  composed by the route files in `apps/web/app/(catalog)/`
- **Fonts**: next/font with Inter (sans), JetBrains Mono (mono),
  Orbitron (display — Pedro approved, keep)
- **Lint/format**: Biome 1.9 (`biome.json` at the root)
- **3D**: three.js + @react-three/fiber + @react-three/drei (installed but
  unused — every page renders a `<ThreeCanvasPlaceholder />` div for now)

## Repo layout

```
sc-site/
├── apps/web/                   # Next.js 15 App Router
│   ├── app/
│   │   ├── globals.css         # imports @sc-site/ui/styles/tokens.css
│   │   ├── layout.tsx          # next/font + body shell
│   │   ├── page.tsx            # redirects → /ships
│   │   └── (catalog)/
│   │       ├── layout.tsx
│   │       ├── ships/
│   │       │   ├── page.tsx           # hangar entry
│   │       │   └── [slug]/page.tsx    # ship detail
│   ├── lib/mock-data.ts        # Carrack / Corsair / Cutlass / Aurora MR fixtures
│   └── public/favicon.svg
├── packages/ui/                # @sc-site/ui — shared components
│   ├── src/
│   │   ├── sc/                 # sc-site-specific composed components
│   │   ├── styles/tokens.css   # canonical design tokens (Tailwind v4 @theme)
│   │   ├── lib/cn.ts
│   │   └── index.ts            # barrel
├── biome.json
├── tsconfig.base.json
└── package.json                # workspace root
```

## Hard constraints

- **Strict TypeScript** everywhere. Zero warnings. Zero errors. Enforced by
  Pedro's memory `feedback_strict_compilation.md`.
- **Biome strict**. `bun run check` must be clean before any commit.
- **Every value uses design tokens**. No hardcoded hex, no magic px, no
  hardcoded font names. Everything through Tailwind classes backed by
  `@theme` in `packages/ui/src/styles/tokens.css`.
- **MOCKUP.md §11 ban list**:
  - no marketing vocab, no neon cyan, no hot pink
  - no modal dialogs (use side panels + drawers)
  - no floating tooltips (use the hairline callout pattern)
  - no animated DOM starfields, no scan lines, no cursor spotlight
  - no font-mono uppercase 0.18em-tracked hacker labels
  - no glows, no `text-shadow`, no gradient text
  - no infinite scroll, no top nav, no hamburger
- **Less than 8% mauve on any screen**. Mauve is an accent.
- **The Pi is Tailscale-only**. The site is never exposed publicly with GLBs
  baked in. `PUBLIC_DEPLOY=1` must strip them.

## Dev workflow

```bash
cd /home/pedro/sc-site
bun install
bun run dev          # next dev --hostname 0.0.0.0 --port 3000
```

The app is reachable from Pedro's Fedora desktop at
`http://100.105.42.81:3000/ships` over Tailscale. HMR propagates edits in
both `apps/web/**` and `packages/ui/**`.

## Verification before commit

```bash
bun run check        # biome lint + format check
bun run typecheck    # tsc --noEmit across all workspaces
```

## What is NOT in the scaffold yet

These are deliberate cuts so the first round ships small:

- Real three.js scene. The `ThreeCanvasPlaceholder` is a div with two soft
  radial washes; the spec from MOCKUP.md §10 (hangar architecture, lighting,
  GLB loader, EdgesGeometry overlay) lands in a follow-up pass.
- Search bar parser (NL → chips). Static demo chips only.
- Command palette (⌘K).
- /map, /trade, /mining, /weapons, /components routes.
- Hardpoint marker layer over the ship mesh.
- Damage-resistance hover sublist + click sticky state.
- History drawer empty-state vs expanded toggle (renders both for review).
- Save / share URL serialisation.
- Loadout editor.
