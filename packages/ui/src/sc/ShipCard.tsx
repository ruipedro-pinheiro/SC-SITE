import type { JSX } from "react";
import { cn } from "../lib/cn";
import type { Ship } from "./types";

interface ShipCardProps {
  ship: Ship;
  className?: string;
}

/**
 * NOTE: MOCKUP.md §11 explicitly bans a ShipCard grid as the catalog. The
 * hangar IS the catalog; this component is *only* used as the small DOM
 * label hovering over each ship in the three.js scene (`.ship-label`
 * style from tokens.css), not as a catalog card.
 *
 * Renders the ship name in `text` + a single-line meta in `overlay0` +
 * a 18 px mauve underline at the bottom — same visual grammar the mockup
 * uses for `vector3.project()`'d labels above the ships.
 */
export function ShipCard({ ship, className }: ShipCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "text-center pointer-events-none",
        "text-11 tracking-label leading-tight whitespace-nowrap",
        className,
      )}
    >
      <div className="text-text font-semibold">{ship.name.toUpperCase()}</div>
      <div className="text-overlay0 text-10 tracking-micro uppercase mt-0.5">
        {ship.manufacturerCode} · {ship.length.toFixed(0)} m
      </div>
      <div className="mx-auto mt-1 h-px w-[18px] bg-mauve opacity-60" />
    </div>
  );
}
