import type { JSX } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { DrawerShell } from "../components/ui/drawer-shell";
import { cn } from "../lib/cn";
import type { HistoryEntry } from "./types";

interface HistoryDrawerProps {
  history: ReadonlyArray<HistoryEntry>;
}

const FILTER_CHIPS: ReadonlyArray<HistoryEntry["category"]> = [
  "combat",
  "mobility",
  "economy",
  "cosmetic",
];

/**
 * Patch-level change timeline drawer (MOCKUP.md §4 — history drawer).
 *
 * The mockup renders BOTH states for the reviewer:
 *   (a) the collapsed trigger as a one-line pill near the top of the right edge.
 *   (b) the expanded drawer below, the click-to-expand target state.
 *
 * Drawer is flush against the right edge with the right border / right radii
 * removed so it bleeds off the canvas. Filter chips reuse the SourceChip
 * visual grammar at 24 px tall.
 *
 * The empty-state rule from §4 — "the drawer only renders if there is
 * something in it" — is enforced here: zero history rows degrade to a
 * single overlay0 label.
 */
export function HistoryDrawer({ history }: HistoryDrawerProps): JSX.Element {
  if (history.length === 0) {
    return (
      <DrawerShell
        as="aside"
        className="fixed z-39"
        style={{ top: "96px", right: 0, width: "var(--width-history-drawer)" }}
      >
        <div className="text-12 text-overlay0">history · no changes since 2026-02-14</div>
      </DrawerShell>
    );
  }

  const totalChanges = history.length * 3; // approximation: ~3 deltas per patch
  const patchCount = history.length;

  return (
    <>
      {/* (a) collapsed trigger */}
      <DrawerShell
        as="aside"
        className="fixed z-39"
        style={{ top: "96px", right: 0, width: "var(--width-history-drawer)" }}
      >
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between p-0 text-left hover:bg-transparent hover:text-inherit"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-13 text-subtext1">history</span>
            <span className="text-overlay0 text-12">·</span>
            <span className="text-12 text-overlay0">
              {totalChanges} changes across {patchCount} patches
            </span>
          </div>
          <span className="text-overlay0 text-12" aria-hidden="true">
            ▾
          </span>
        </Button>
      </DrawerShell>

      {/* (b) expanded drawer — the click-to-expand target state */}
      <DrawerShell
        as="section"
        className="fixed z-30"
        style={{ bottom: "64px", right: 0, width: "var(--width-history-drawer)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-13 text-subtext1">history</span>
            <span className="text-overlay0 text-12">·</span>
            <span className="text-12 text-overlay0">{totalChanges} changes</span>
          </div>
          <span className="text-overlay0 text-12" aria-hidden="true">
            ▴
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {FILTER_CHIPS.map((chip, index) => {
            const active = index < 3;
            return (
              <Badge
                key={chip}
                className={cn("px-2 py-0.5 text-10 rounded-sm", !active && "text-subtext0")}
                variant={active ? "accent" : "outline"}
              >
                {chip}
              </Badge>
            );
          })}
        </div>

        <div className="flex flex-col">
          {history.slice(0, 3).map((entry) => (
            <div
              key={entry.version}
              className="grid grid-cols-[1fr_auto] gap-3 py-2.5 border-b border-surface0 last:border-b-0"
            >
              <div>
                <div className="font-mono text-13 text-subtext1">{entry.version}</div>
                <div className="text-12 text-subtext0 mt-0.5 leading-snug">{entry.summary}</div>
              </div>
              <div className="text-overlay0 text-11 font-mono whitespace-nowrap pl-3">
                {entry.date}
              </div>
            </div>
          ))}
        </div>
      </DrawerShell>
    </>
  );
}
