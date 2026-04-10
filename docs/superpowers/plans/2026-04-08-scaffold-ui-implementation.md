# Scaffold UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current sc-site scaffold into a modular React + Tailwind + shadcn-style UI system while keeping the same page structure and visual identity.

**Architecture:** Keep `packages/ui` as the design-system package, add a reusable primitive layer under `src/components/ui`, then refactor `src/sc` components to compose those primitives. `apps/web` pages remain responsible for data fetching and route composition only.

**Tech Stack:** Bun workspaces, Next.js App Router, React 19, Tailwind v4, TypeScript, Biome.

---

### Task 1: Set up the primitive UI layer

**Files:**
- Create: `packages/ui/src/components/ui/button.tsx`
- Create: `packages/ui/src/components/ui/input.tsx`
- Create: `packages/ui/src/components/ui/badge.tsx`
- Create: `packages/ui/src/components/ui/separator.tsx`
- Create: `packages/ui/src/components/ui/panel-shell.tsx`
- Create: `packages/ui/src/components/ui/stat-row.tsx`
- Create: `packages/ui/src/components/ui/text-kbd.tsx`
- Create: `packages/ui/src/components/ui/drawer-shell.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] Create the primitive component files with shared Tailwind class contracts and typed props.
- [ ] Export the primitives from `packages/ui/src/index.ts`.
- [ ] Run `bun --filter '@sc-site/ui' typecheck`.
- [ ] Run `bun check`.
- [ ] Commit with `git commit -m "feat: add reusable ui primitives"`.

### Task 2: Refactor navigation and query components onto primitives

**Files:**
- Modify: `packages/ui/src/sc/TopNav.tsx`
- Modify: `packages/ui/src/sc/BottomTextNav.tsx`
- Modify: `packages/ui/src/sc/SourceChip.tsx`
- Modify: `packages/ui/src/sc/QueryRail.tsx`

- [ ] Replace handwritten chrome pieces with primitive usage where appropriate.
- [ ] Keep the same rendered structure and copy.
- [ ] Keep page-facing props stable unless a simplification is clearly better and easy to propagate.
- [ ] Run `bun --filter '@sc-site/ui' typecheck`.
- [ ] Commit with `git commit -m "refactor: rebuild nav and query chrome on ui primitives"`.

### Task 3: Refactor panels and ship detail widgets

**Files:**
- Modify: `packages/ui/src/sc/IdentityPanel.tsx`
- Modify: `packages/ui/src/sc/LogisticsPanel.tsx`
- Modify: `packages/ui/src/sc/CombatPanel.tsx`
- Modify: `packages/ui/src/sc/DamageResistanceStrip.tsx`
- Modify: `packages/ui/src/sc/HistoryDrawer.tsx`
- Modify: `packages/ui/src/sc/ThreeCanvasPlaceholder.tsx`
- Modify: `packages/ui/src/sc/ShipHero.tsx`

- [ ] Move repeated panel framing into `panel-shell` / `drawer-shell`.
- [ ] Move repeated row rendering into `stat-row`.
- [ ] Keep all existing data fields and labels.
- [ ] Keep the history drawer dual-state presentation.
- [ ] Run `bun --filter '@sc-site/ui' typecheck`.
- [ ] Commit with `git commit -m "refactor: modularize ship detail panels"`.

### Task 4: Thin down the web pages

**Files:**
- Modify: `apps/web/app/(catalog)/ships/page.tsx`
- Modify: `apps/web/app/(catalog)/ships/[slug]/page.tsx`
- Modify: `apps/web/components/error-state.tsx`
- Modify: `apps/web/lib/api.ts` if small adapter cleanup is needed

- [ ] Remove page-local presentational duplication and rely on `@sc-site/ui`.
- [ ] Keep data fetching and routing logic in page files.
- [ ] Keep the same response handling, error behavior, and route behavior.
- [ ] Run `bun --filter '@sc-site/web' typecheck`.
- [ ] Commit with `git commit -m "refactor: simplify scaffold pages around shared ui"`.

### Task 5: Verify the redesign end to end

**Files:**
- No new files required unless a tiny follow-up cleanup is needed

- [ ] Run `bun check`.
- [ ] Run `bun typecheck`.
- [ ] Run `bun --filter '@sc-site/web' dev` and verify `/ships` and `/ships/carrack`.
- [ ] Fix any regressions found during the browser pass.
- [ ] Commit with `git commit -m "chore: verify scaffold ui redesign"`.
