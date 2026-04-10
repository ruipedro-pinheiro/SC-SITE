import type { JSX, ReactNode } from "react";

interface ShipHeroProps {
  children: ReactNode;
}

/**
 * Wrapper for the full-bleed ship-detail layout (MOCKUP.md §4 ship-detail).
 *
 * The hero is a fragment-style container — it does not introduce any DOM
 * chrome of its own (no header, no padding) because the panels float over
 * the canvas via fixed positioning. It exists as a named seam so the page
 * file reads as a single composition root.
 */
export function ShipHero({ children }: ShipHeroProps): JSX.Element {
  return <main className="relative min-h-screen overflow-hidden">{children}</main>;
}
