import type { JSX, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface DataTableColumn {
  /** Key used for sort params and row value lookup. */
  key: string;
  /** Display label rendered in the header. */
  label: string;
  /** Whether clicking the header toggles sort. */
  sortable?: boolean;
  /** Right-align numeric columns. */
  align?: "left" | "right";
  /** Render value in mono font. */
  mono?: boolean;
}

export interface DataTableRow {
  /** Unique key for the row. */
  id: string;
  /** Optional href — makes the row name clickable. */
  href?: string | undefined;
  /** Column key → display value. */
  cells: Readonly<Record<string, ReactNode>>;
}

export interface DataTableProps {
  columns: ReadonlyArray<DataTableColumn>;
  rows: ReadonlyArray<DataTableRow>;
  /** Currently active sort column key. */
  sortKey?: string | undefined;
  /** Current sort direction. */
  sortDir?: "asc" | "desc" | undefined;
  /** Base path for sort/pagination links (e.g. "/weapons"). */
  basePath: string;
  /** Current URL search params to preserve when building links. */
  currentParams?: Readonly<Record<string, string>> | undefined;
  /** Total row count (for "showing X of Y" label). */
  totalRows?: number | undefined;
  /** Current page (1-based). */
  currentPage?: number | undefined;
  /** Rows per page. */
  pageSize?: number | undefined;
}

function buildSortHref(
  basePath: string,
  currentParams: Readonly<Record<string, string>>,
  key: string,
  currentSortKey: string | undefined,
  currentSortDir: string | undefined,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(currentParams)) {
    if (k !== "sort" && k !== "dir" && k !== "page") {
      params.set(k, v);
    }
  }
  params.set("sort", key);
  const nextDir = key === currentSortKey && currentSortDir === "asc" ? "desc" : "asc";
  params.set("dir", nextDir);
  return `${basePath}?${params.toString()}`;
}

function buildPageHref(
  basePath: string,
  currentParams: Readonly<Record<string, string>>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(currentParams)) {
    if (k !== "page") {
      params.set(k, v);
    }
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function SortIndicator({
  active,
  dir,
}: { active: boolean; dir: string | undefined }): JSX.Element | null {
  if (!active) return null;
  return (
    <span className="text-mauve ml-1" aria-hidden="true">
      {dir === "desc" ? "▾" : "▴"}
    </span>
  );
}

/**
 * Dense sortable data table for catalog list pages (weapons, components,
 * trade, shops, mining). Server-rendered — sort and pagination use `<a>`
 * links with query params rather than client-side state.
 *
 * Follows the panel visual grammar: surface0 borders, text/subtext/overlay
 * color hierarchy, mono values, tracking-micro headers.
 */
export function DataTable({
  columns,
  rows,
  sortKey,
  sortDir,
  basePath,
  currentParams = {},
  totalRows,
  currentPage = 1,
  pageSize = 50,
}: DataTableProps): JSX.Element {
  const total = totalRows ?? rows.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-surface0">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "py-2 px-3 text-10 tracking-micro text-overlay0 uppercase font-normal whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.sortable ? (
                    <a
                      href={buildSortHref(basePath, currentParams, col.key, sortKey, sortDir)}
                      className="hover:text-text transition-colors duration-180 ease-deliberate"
                    >
                      {col.label}
                      <SortIndicator active={sortKey === col.key} dir={sortDir} />
                    </a>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-12 text-overlay0">
                  no data available
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-surface0 last:border-b-0 hover:bg-mantle/40 transition-colors duration-180 ease-deliberate"
              >
                {columns.map((col, colIdx) => {
                  const cell = row.cells[col.key];
                  const isFirst = colIdx === 0;
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "py-2 px-3 text-13",
                        col.align === "right" ? "text-right" : "text-left",
                        col.mono ? "font-mono text-text" : "text-subtext1",
                        isFirst && "text-text",
                      )}
                    >
                      {isFirst && row.href ? (
                        <a
                          href={row.href}
                          className="hover:text-mauve transition-colors duration-180 ease-deliberate"
                        >
                          {cell}
                        </a>
                      ) : (
                        (cell ?? <span className="text-overlay0">—</span>)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination + count */}
      <div className="mt-4 flex items-center justify-between text-11 text-overlay0">
        <span>
          {rows.length} of {total} results
        </span>
        {totalPages > 1 ? (
          <div className="flex items-center gap-3">
            {currentPage > 1 ? (
              <a
                href={buildPageHref(basePath, currentParams, currentPage - 1)}
                className="text-subtext0 hover:text-text transition-colors duration-180 ease-deliberate"
              >
                ← prev
              </a>
            ) : (
              <span className="text-surface1">← prev</span>
            )}
            <span className="font-mono text-subtext0">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <a
                href={buildPageHref(basePath, currentParams, currentPage + 1)}
                className="text-subtext0 hover:text-text transition-colors duration-180 ease-deliberate"
              >
                next →
              </a>
            ) : (
              <span className="text-surface1">next →</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
