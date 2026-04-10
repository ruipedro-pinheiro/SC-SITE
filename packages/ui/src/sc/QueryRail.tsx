import type { JSX } from "react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/cn";
import { type QuerySource, SourceChip } from "./SourceChip";

export interface QueryChip {
  source: QuerySource;
  label: string;
}

interface QueryRailProps {
  chips: ReadonlyArray<QueryChip>;
  matchCount: number;
  className?: string;
}

/**
 * The query rail (MOCKUP.md §5.1) — a horizontal row of source-badged chips
 * with a `+ add` button on the right and a `N MATCH` count below.
 *
 * The rail is the only chrome on the hangar entry, the rest of the page is
 * the three.js canvas. Chips are AND by default; OR-grouping (shift-click)
 * is a future iteration.
 *
 * This component is presentation-only; chip state lives in the page that
 * renders it.
 */
export function QueryRail({ chips, matchCount, className }: QueryRailProps): JSX.Element {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {chips.map((chip) => (
          <SourceChip
            key={`${chip.source}-${chip.label}`}
            source={chip.source}
            label={chip.label}
          />
        ))}

        <Button type="button" aria-label="add filter" variant="outline" size="md">
          + add
        </Button>
      </div>

      <div className="text-10 tracking-micro text-subtext0">
        <span className="text-text font-semibold">{matchCount}</span> MATCH
      </div>
    </div>
  );
}
