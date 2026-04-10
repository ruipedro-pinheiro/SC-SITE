import type { JSX } from "react";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/cn";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  /** Query param key (e.g. "type", "size", "manufacturer"). */
  key: string;
  /** Display label for the filter group. */
  label: string;
  /** Available options. */
  options: ReadonlyArray<FilterOption>;
}

export interface FilterBarProps {
  filters: ReadonlyArray<FilterGroup>;
  /** Currently active filter values keyed by filter group key. */
  activeFilters: Readonly<Record<string, string>>;
  /** Base path for building filter links (e.g. "/weapons"). */
  basePath: string;
  /** Additional search params to preserve. */
  currentParams?: Readonly<Record<string, string>> | undefined;
  className?: string | undefined;
}

function buildFilterHref(
  basePath: string,
  currentParams: Readonly<Record<string, string>>,
  filterKey: string,
  filterValue: string,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(currentParams)) {
    if (k !== filterKey && k !== "page") {
      params.set(k, v);
    }
  }
  if (filterValue.length > 0) {
    params.set(filterKey, filterValue);
  }
  const qs = params.toString();
  return qs.length > 0 ? `${basePath}?${qs}` : basePath;
}

/**
 * Row of filter chips for data table pages. Each filter group renders as
 * a set of inline badge links — clicking one navigates with the filter
 * applied via query params. Server-rendered, no JS required.
 *
 * Active filters show as mauve accent badges; inactive as outline.
 * Clicking an active filter removes it (navigates without that param).
 */
export function FilterBar({
  filters,
  activeFilters,
  basePath,
  currentParams = {},
  className,
}: FilterBarProps): JSX.Element {
  return (
    <div className={cn("flex items-start gap-6 flex-wrap", className)}>
      {filters.map((group) => {
        const activeValue = activeFilters[group.key];
        return (
          <div key={group.key} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-10 tracking-micro text-overlay0 uppercase mr-1">
              {group.label}
            </span>
            {/* "all" chip to clear this filter */}
            <a href={buildFilterHref(basePath, currentParams, group.key, "")}>
              <Badge
                variant={activeValue === undefined || activeValue === "" ? "accent" : "outline"}
                className="px-2 py-0.5 text-11 rounded-sm cursor-pointer"
              >
                all
              </Badge>
            </a>
            {group.options.map((opt) => {
              const isActive = activeValue === opt.value;
              return (
                <a
                  key={opt.value}
                  href={buildFilterHref(
                    basePath,
                    currentParams,
                    group.key,
                    isActive ? "" : opt.value,
                  )}
                >
                  <Badge
                    variant={isActive ? "accent" : "outline"}
                    className="px-2 py-0.5 text-11 rounded-sm cursor-pointer"
                  >
                    {opt.label}
                  </Badge>
                </a>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
