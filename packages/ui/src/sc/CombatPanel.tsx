import type { JSX } from "react";
import { PanelShell } from "../components/ui/panel-shell";
import { StatRow } from "../components/ui/stat-row";
import { DamageResistanceStrip } from "./DamageResistanceStrip";
import type { Hardpoint, Ship } from "./types";

interface CombatPanelProps {
  ship: Ship;
}

const NUMBER_FMT = new Intl.NumberFormat("en-US");

function formatThousands(value: number): string {
  return NUMBER_FMT.format(value).replaceAll(",", " ");
}

/**
 * Group hardpoints by `${location}-${type}` so the combat panel renders one
 * row per logical mount class instead of per individual hardpoint.
 */
interface HardpointGroup {
  key: string;
  count: number;
  size: number;
  location: Hardpoint["location"];
  type: Hardpoint["type"];
}

function groupHardpoints(hardpoints: ReadonlyArray<Hardpoint>): HardpointGroup[] {
  const groups = new Map<string, HardpointGroup>();
  for (const hp of hardpoints) {
    const key = `${hp.location}-${hp.type}-${hp.size}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        key,
        count: 1,
        size: hp.size,
        location: hp.location,
        type: hp.type,
      });
    }
  }
  return Array.from(groups.values());
}

function formatGroupLabel(group: HardpointGroup): string {
  return `${group.count} × S${group.size} ${group.type}`;
}

function formatGroupKey(group: HardpointGroup): string {
  return `${group.location} ${group.type === "rack" ? "rack" : "guns"}`;
}

/**
 * Bottom-right orbiting panel on ship-detail (MOCKUP.md §4).
 *
 * Single unified card — the brief explicitly bans the previous tab strip
 * (combat | mobility | dimensions | economy). Renders shield/hull HP,
 * grouped hardpoint rows, and the damage-resistance strip below.
 *
 * The panel slides left by `drawerWidth` (default 360) so it clears the
 * history drawer flush against the right edge of the canvas.
 */
export function CombatPanel({ ship }: CombatPanelProps): JSX.Element {
  const groups = groupHardpoints(ship.hardpoints);

  return (
    <PanelShell as="aside" eyebrow="combat" className="w-full">
      {ship.shieldHp > 0 ? (
        <StatRow label="shield HP" value={formatThousands(ship.shieldHp)} />
      ) : null}
      {ship.hullHp > 0 ? <StatRow label="hull HP" value={formatThousands(ship.hullHp)} /> : null}

      {groups.map((group) => (
        <StatRow key={group.key} label={formatGroupKey(group)} value={formatGroupLabel(group)} />
      ))}

      {ship.hardpoints.length === 0 && ship.shieldHp === 0 && ship.hullHp === 0 ? (
        <div className="text-11 text-overlay0 py-2">no combat data available</div>
      ) : null}

      <DamageResistanceStrip resistance={ship.damageResistance} />
    </PanelShell>
  );
}
