import type { JSX } from "react";
import { PanelShell } from "../components/ui/panel-shell";
import { Separator } from "../components/ui/separator";
import type { Ship } from "./types";

type HangarManifestShip = Pick<
  Ship,
  "slug" | "name" | "manufacturer" | "manufacturerCode" | "length"
>;

interface HangarManifestProps {
  ships: ReadonlyArray<HangarManifestShip>;
  totalCount: number;
}

export function HangarManifest({ ships, totalCount }: HangarManifestProps): JSX.Element {
  return (
    <PanelShell
      as="aside"
      eyebrow="manifest"
      className="fixed left-10 bottom-20 z-30 w-[320px] max-h-[340px] overflow-y-auto"
    >
      <div className="text-12 text-overlay0 mb-3">
        {ships.length} visible · {totalCount} total in catalog
      </div>
      <div className="flex flex-col">
        {ships.map((ship, index) => (
          <div key={ship.slug}>
            <a
              href={`/ships/${ship.slug}`}
              className="group flex items-baseline justify-between gap-3 py-2 transition-colors duration-180 ease-deliberate"
            >
              <div className="min-w-0">
                <div className="text-12 text-text truncate group-hover:text-mauve">
                  {ship.name.toUpperCase()}
                </div>
                <div className="text-10 tracking-micro uppercase text-overlay0 mt-0.5">
                  {ship.manufacturer || ship.manufacturerCode} · {ship.length.toFixed(0)} m
                </div>
              </div>
              <div className="text-10 text-overlay0 group-hover:text-text">↗</div>
            </a>
            {index < ships.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
