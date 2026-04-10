# sc-site Scaffold UI Redesign

Goal: rebuild the existing scaffold into a cleaner, more modular React + Tailwind + shadcn-style UI system without changing the scaffold's actual product structure.

Approved direction: keep the current scaffold UX and page structure exactly as the source of truth, but replace ad-hoc page markup with reusable primitives and SC-specific composition components.

## Product constraints

- Follow the scaffold, not a new concept.
- Keep the current page architecture:
  - `/ships` = hangar canvas, centered search, query rail, bottom nav, empty state
  - `/ships/[slug]` = full-bleed hero, top nav, identity/logistics/combat panels, history drawer, bottom nav
- Keep the current visual language from `tokens.css`: Catppuccin Mocha, Orbitron display type, mono stats, mauve as accent, sharp radii, quiet chrome.
- Do not turn the site into a generic shadcn dashboard.

## Technical direction

The UI package becomes a two-layer system.

Layer 1 is a reusable primitive library built with React + Tailwind in the style of shadcn/ui:

- `button`
- `input`
- `badge`
- `separator`
- `panel-shell`
- `stat-row`
- `text-kbd`
- `drawer-shell`
- `surface-frame`

These primitives own accessibility, sizing, spacing, and variant discipline.

Layer 2 is the SC-specific component layer:

- `TopNav`
- `BottomTextNav`
- `SourceChip`
- `QueryRail`
- `IdentityPanel`
- `LogisticsPanel`
- `CombatPanel`
- `DamageResistanceStrip`
- `HistoryDrawer`
- `ThreeCanvasPlaceholder`
- `ShipHero`

These components compose the primitives and encode the product language. Pages in `apps/web` should depend on this layer, not on raw primitives.

## File structure

`packages/ui` becomes the design-system home.

- `src/components/ui/*` holds reusable primitives
- `src/sc/*` holds SC-specific components
- `src/styles/tokens.css` remains the single visual token source
- `src/index.ts` exports only the public surface

`apps/web` keeps page ownership and data fetching, but loses repeated presentation markup. Pages should mostly compose imported UI pieces.

## Design rules

- No hardcoded page-only styling if a reusable primitive can own it.
- No direct color hexes in TSX.
- No page file should manually recreate panel chrome, chip chrome, row chrome, or empty-state chrome.
- Repeated overlay positioning should be centralized as small wrapper components or shared layout helpers.
- Keep component files small and single-purpose.

## Scope of the first implementation pass

1. Introduce the primitive layer in `packages/ui`
2. Refactor the existing SC components to use those primitives
3. Refactor `/ships` and `/ships/[slug]` to use the cleaned component API
4. Preserve current behavior and route structure
5. Do not redesign the 3D scene yet
6. Do not add new product pages yet

## Non-goals

- No product rethink
- No data-model rewrite
- No Figma dependency
- No full responsive redesign beyond cleaning the current scaffold
- No animation system expansion

## Success criteria

- The site still looks like the current scaffold, but cleaner and more consistent
- The page files become noticeably thinner
- Shared UI logic lives in `packages/ui`
- New pages can be built from primitives + SC composites instead of copy-paste
- Tailwind + React structure follows best practices instead of one-off page markup
