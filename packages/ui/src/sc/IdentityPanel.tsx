import type { JSX } from "react";
import { PanelShell } from "../components/ui/panel-shell";
import { Separator } from "../components/ui/separator";
import { StatRow } from "../components/ui/stat-row";
import type { Ship } from "./types";

interface IdentityPanelProps {
  ship: Ship;
}

const NUMBER_FMT = new Intl.NumberFormat("en-US");

function formatThousands(value: number): string {
  return NUMBER_FMT.format(value).replaceAll(",", " ");
}

/**
 * Top-left orbiting panel on ship-detail (MOCKUP.md §4 ASCII layout).
 *
 * "What is this ship": manufacturer, ship name in Orbitron, role/size,
 * dimensions row, then a Stripe-style data list with the in-game economy
 * first and the quiet RSI pledge link second. Every numeric value is mono.
 *
 * Fixed-position in this scaffold; in the production scene this becomes a
 * `vector3.project()` anchor pinned above the bow of the ship.
 */
export function IdentityPanel({ ship }: IdentityPanelProps): JSX.Element {
  return (
    <PanelShell as="aside" eyebrow="specs" className="w-full">
      <div className="flex items-center gap-3 text-11 text-subtext0 tracking-label uppercase mb-3">
        {ship.role} <span className="text-overlay0">·</span> {ship.size}
      </div>

      <div className="flex items-center gap-3 font-mono text-11 text-subtext1 flex-wrap">
        <span>
          <span className="text-overlay0">L</span> {ship.length.toFixed(1)} m
        </span>
        <span className="text-overlay0">·</span>
        <span>
          <span className="text-overlay0">B</span> {ship.beam.toFixed(1)} m
        </span>
        <span className="text-overlay0">·</span>
        <span>
          <span className="text-overlay0">H</span> {ship.height.toFixed(1)} m
        </span>
        {ship.massEmpty > 0 ? (
          <>
            <span className="text-overlay0">·</span>
            <span>
              <span className="text-overlay0">M</span> {formatThousands(ship.massEmpty)} t
            </span>
          </>
        ) : null}
      </div>

      <Separator className="mt-3" />

      {ship.buyPriceAuec !== undefined ? (
        <StatRow
          label="in-game price"
          value={`${formatThousands(ship.buyPriceAuec)} aUEC`}
          valueClassName="text-peach"
        />
      ) : null}
      {ship.buyAt ? <StatRow label="in-game shop" value={ship.buyAt} /> : null}
      {ship.pledgeStoreUrl ? (
        <StatRow
          label="pledge store"
          value={
            <a
              href={ship.pledgeStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="text-mauve hover:text-text transition-colors duration-180 ease-deliberate"
            >
              RSI ↗
            </a>
          }
          valueClassName="text-mauve"
        />
      ) : null}
      {ship.pledgeUsd !== undefined ? (
        <StatRow label="pledge" value={`$${ship.pledgeUsd}`} />
      ) : null}
    </PanelShell>
  );
}
