import type { JSX } from "react";
import { cn } from "../lib/cn";

interface PanelHairlineProps {
  className?: string;
}

/**
 * The single sanctioned gradient in the whole DOM (MOCKUP.md §8 rule 4).
 *
 * A 1 px linear-gradient mauve hairline that fades transparent → mauve(0.55) →
 * transparent. It sits at the top edge of focused panels and the bottom edge
 * of the search bar in NL-mode. Fades in over 200 ms when a panel becomes
 * focused.
 *
 * Implementation lives in tokens.css under `@layer components { .panel-hairline }`
 * — this React wrapper just composes that class.
 */
export function PanelHairline({ className }: PanelHairlineProps): JSX.Element {
  return <div aria-hidden="true" className={cn("panel-hairline", className)} />;
}
