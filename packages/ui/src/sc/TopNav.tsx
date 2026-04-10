import type { JSX } from "react";
import { TextKbd } from "../components/ui/text-kbd";
import { cn } from "../lib/cn";

interface TopNavProps {
  /** When true (e.g. on the hangar entry) the back link is hidden — we're already home. */
  showBack?: boolean;
  /** Optional ship name shown in the top centre on detail pages. */
  centerLabel?: string;
  /** Optional manufacturer or subtitle, in overlay0, after the centre label. */
  centerSub?: string;
}

/**
 * Top chrome row — minimal by design (MOCKUP.md §6: "no top nav, no tabs, no
 * sidebar, the canvas is the chrome").
 *
 * Renders only:
 * - top-left "← back to hangar" link on detail pages.
 * - top-right `jump to ⌘ K` hint.
 *
 * No wordmark, no brand, no menu. The hangar entry omits the back link.
 */
export function TopNav({ showBack = false, centerLabel, centerSub }: TopNavProps): JSX.Element {
  return (
    <>
      {showBack ? (
        <a
          href="/ships"
          className={cn(
            "fixed top-10 left-10 text-12 text-subtext0 hover:text-mauve",
            "transition-colors duration-180 ease-deliberate z-30",
          )}
        >
          ← back to hangar
        </a>
      ) : null}

      {centerLabel ? (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
          <div className="font-display text-14 font-semibold text-text tracking-tightx">
            {centerLabel}
          </div>
          {centerSub ? (
            <div className="text-10 tracking-micro text-overlay0 uppercase mt-1">{centerSub}</div>
          ) : null}
        </div>
      ) : null}

      <div className="fixed top-10 right-10 z-30 flex items-center gap-2 text-11 tracking-micro text-overlay0 select-none">
        <span>jump to</span>
        <TextKbd>⌘ K</TextKbd>
      </div>
    </>
  );
}
