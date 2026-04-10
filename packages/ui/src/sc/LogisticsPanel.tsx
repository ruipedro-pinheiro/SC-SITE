import type { JSX } from "react";
import { PanelShell } from "../components/ui/panel-shell";
import { StatRow } from "../components/ui/stat-row";
import type { Ship } from "./types";

interface LogisticsPanelProps {
  ship: Ship;
}

const NUMBER_FMT = new Intl.NumberFormat("en-US");

function formatThousands(value: number): string {
  return NUMBER_FMT.format(value).replaceAll(",", " ");
}

/**
 * Bottom-left orbiting panel on ship-detail (MOCKUP.md §4).
 *
 * "What does this ship CARRY and HOW FAR can it go": SCU, crew range,
 * quantum range + fuel, hydrogen tank, vehicle bay. Stripe-style data list.
 */
export function LogisticsPanel({ ship }: LogisticsPanelProps): JSX.Element {
  return (
    <PanelShell as="aside" eyebrow="logistics" className="w-full">
      {ship.scu > 0 ? (
        <StatRow label="cargo grid" value={`${formatThousands(ship.scu)} SCU`} />
      ) : null}
      <StatRow
        label="crew"
        value={
          <>
            {ship.crewMin} – {ship.crewMax}
          </>
        }
      />
      {ship.scmSpeed !== undefined && ship.scmSpeed > 0 ? (
        <StatRow label="SCM speed" value={`${formatThousands(ship.scmSpeed)} m/s`} />
      ) : null}
      {ship.maxSpeed !== undefined && ship.maxSpeed > 0 ? (
        <StatRow label="max speed" value={`${formatThousands(ship.maxSpeed)} m/s`} />
      ) : null}
      {ship.quantumRangeGm !== undefined && ship.quantumRangeGm > 0 ? (
        <StatRow label="quantum range" value={`${ship.quantumRangeGm.toFixed(1)} Gm`} />
      ) : null}
      {ship.quantumFuelUscu !== undefined && ship.quantumFuelUscu > 0 ? (
        <StatRow label="quantum fuel" value={`${formatThousands(ship.quantumFuelUscu)} µSCU`} />
      ) : null}
      {ship.hydrogenL !== undefined && ship.hydrogenL > 0 ? (
        <StatRow label="hydrogen tank" value={`${formatThousands(ship.hydrogenL)} L`} />
      ) : null}
      {ship.vehicleBay ? <StatRow label="vehicle bay" value={ship.vehicleBay} /> : null}
    </PanelShell>
  );
}
