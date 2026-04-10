import type { JSX } from "react";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/cn";

/**
 * The two-letter source codes from MOCKUP.md §5.1. The dot color tags each
 * source visually so the rail reads as a multi-source query at a glance.
 */
export type QuerySource = "SP" | "FY" | "CS" | "UEX" | "ER" | "WK" | "RSI";

const SOURCE_DOT_COLOR: Record<QuerySource, string> = {
  SP: "bg-peach",
  FY: "bg-sky",
  CS: "bg-green",
  UEX: "bg-mauve",
  ER: "bg-lavender",
  WK: "bg-subtext0",
  RSI: "bg-pink",
};

interface SourceChipProps {
  source: QuerySource;
  label: string;
  active?: boolean;
  onRemove?: () => void;
  className?: string;
}

/**
 * One chip in the query rail (MOCKUP.md §5.1).
 *
 * - 28 px tall (matches --height-chip), 12 px horizontal padding.
 * - Source-coloured 4 px dot + 2-letter code in overlay0, then the chip label.
 * - Active state: 1 px mauve border + mauve/6% background. Inactive: surface0
 *   border. Hover: surface1.
 * - The × close button is visible only on hover and only if `onRemove` is set.
 *
 * Static demo on the hangar entry page passes `active` and no `onRemove`.
 */
export function SourceChip({
  source,
  label,
  active = true,
  onRemove,
  className,
}: SourceChipProps): JSX.Element {
  const dotClass = SOURCE_DOT_COLOR[source];
  return (
    <Badge
      variant={active ? "accent" : "outline"}
      className={cn(
        "group pl-2.5 pr-3 text-12",
        !active && "hover:border-surface1 hover:text-text",
        className,
      )}
      style={{ minHeight: "var(--height-chip)" }}
    >
      <span aria-hidden="true" className={cn("h-1 w-1 rounded-full shrink-0", dotClass)} />
      <span className="text-overlay0 text-10 font-mono">{source}</span>
      <span>{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`remove filter ${label}`}
          className="text-overlay0 ml-1 hover:text-text opacity-0 group-hover:opacity-100 transition-opacity duration-180 ease-deliberate"
        >
          ×
        </button>
      ) : null}
    </Badge>
  );
}
