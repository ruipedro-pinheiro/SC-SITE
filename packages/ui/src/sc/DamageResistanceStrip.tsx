import type { JSX } from "react";
import { cn } from "../lib/cn";
import type { DamageResistance, DamageResistanceRow } from "./types";

interface DamageResistanceStripProps {
  resistance: DamageResistance;
}

const ROWS: ReadonlyArray<{ key: keyof DamageResistance; label: string }> = [
  { key: "physical", label: "physical" },
  { key: "distortion", label: "distortion" },
  { key: "energy", label: "energy" },
  { key: "thermal", label: "thermal" },
  { key: "biochemical", label: "biochem" },
];

interface BarProps {
  label: string;
  row: DamageResistanceRow;
}

function Bar({ label, row }: BarProps): JSX.Element {
  return (
    <div className="dr-row mb-2 last:mb-0">
      <div className="text-10 tracking-label text-overlay0 uppercase">{label}</div>
      <div className="dr-track">
        <div
          className={cn(
            "dr-fill",
            row.accent === "sky" && "accent-sky",
            row.accent === "peach" && "accent-peach",
          )}
          style={{ width: `${row.fillPct}%` }}
        />
      </div>
      <div className="text-11 font-mono text-subtext0 text-right">{row.multiplier.toFixed(2)}</div>
    </div>
  );
}

/**
 * Five horizontal bars stacked vertically, one per damage type
 * (MOCKUP.md §4 — damage-resistance strip inside the combat panel).
 *
 * - Width is `1 / aggregated_multiplier` so longer = more resistant ("big = good").
 * - Mauve fill at 55% over a `surface0` track.
 * - Strongest two rows get a 1 px sky inset border, weakest two get peach.
 *
 * Hover/click interactions are spec'd in MOCKUP.md but not wired here yet.
 */
export function DamageResistanceStrip({ resistance }: DamageResistanceStripProps): JSX.Element {
  return (
    <div className="mt-4 pt-4 border-t border-surface0">
      <div className="text-10 tracking-micro text-overlay0 uppercase mb-3">damage resistance</div>
      {ROWS.map((row) => (
        <Bar key={row.key} label={row.label} row={resistance[row.key]} />
      ))}
    </div>
  );
}
