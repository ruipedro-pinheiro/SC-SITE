import type { JSX } from "react";
import { cn } from "../lib/cn";

interface ThreeCanvasPlaceholderProps {
  /** Subtle label drawn in the centre, e.g. "hangar scene". */
  label?: string;
  className?: string;
}

/**
 * Placeholder for the future three.js canvas (MOCKUP.md §10).
 *
 * The real scene comes in a later pass — for now the page renders a full-bleed
 * `crust`-coloured div with a quiet centre label. Mauve and sky radial washes
 * approximate the dominant lighting so the page does not read as a blank
 * rectangle in the meantime.
 *
 * The label and washes vanish as soon as a real `<Canvas>` mounts on top.
 */
export function ThreeCanvasPlaceholder({
  label: _label,
  className,
}: ThreeCanvasPlaceholderProps): JSX.Element {
  return (
    <div
      className={cn(
        "fixed inset-0 z-0 bg-crust overflow-hidden",
        // Two soft radial washes — mauve key, sky rim — replace the §11-banned
        // animated DOM starfield with a static lighting hint.
        "before:content-[''] before:absolute before:inset-0 before:pointer-events-none",
        "before:bg-[radial-gradient(ellipse_at_30%_40%,rgba(203,166,247,0.10),transparent_60%)]",
        "after:content-[''] after:absolute after:inset-0 after:pointer-events-none",
        "after:bg-[radial-gradient(ellipse_at_75%_70%,rgba(137,220,235,0.06),transparent_60%)]",
        className,
      )}
    >
      {/* Label hidden — visible only in dev or when explicitly enabled */}
    </div>
  );
}
