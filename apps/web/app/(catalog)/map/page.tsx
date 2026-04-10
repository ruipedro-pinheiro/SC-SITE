import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { FilterBar, type FilterGroup, PageShell, Separator } from "@sc-site/ui";

export const dynamic = "force-dynamic";

const TYPE_FILTERS: ReadonlyArray<FilterGroup> = [
  {
    key: "type",
    label: "type",
    options: [
      { label: "stars", value: "Star" },
      { label: "planets", value: "Planet" },
      { label: "moons", value: "Moon" },
      { label: "stations", value: "Station" },
      { label: "outposts", value: "Outpost" },
      { label: "landing zones", value: "LandingZone" },
    ],
  },
];

interface MapPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

interface BreadcrumbItem {
  reference: string;
  name: string;
}

async function fetchBreadcrumb(parentRef: string): Promise<BreadcrumbItem[]> {
  const crumbs: BreadcrumbItem[] = [];
  let current: string | null = parentRef;
  let depth = 0;
  while (current && depth < 10) {
    let res: Awaited<ReturnType<(typeof api.locations)[":id"]["$get"]>>;
    try {
      res = await api.locations[":id"].$get({ param: { id: current } });
    } catch {
      break;
    }
    if (!res.ok) break;
    const body = await res.json();
    if (!("data" in body)) break;
    const loc = body.data;
    crumbs.unshift({ reference: loc.reference, name: loc.name });
    current = loc.parent;
    depth++;
  }
  return crumbs;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const raw = searchParams ? await searchParams : {};
  const type = firstString(raw.type) || "";
  const parent = firstString(raw.parent);
  const page = Math.max(1, Number(firstString(raw.page)) || 1);
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const params: Record<string, string> = {};
  if (type) params.type = type;
  if (parent) params.parent = parent;

  const breadcrumb: BreadcrumbItem[] = parent ? await fetchBreadcrumb(parent) : [];

  let res: Awaited<ReturnType<typeof api.locations.$get>>;
  try {
    res = await api.locations.$get({
      query: {
        ...(type
          ? {
              type: type as
                | "Planet"
                | "Moon"
                | "Station"
                | "Outpost"
                | "LandingZone"
                | "Star"
                | "Default",
            }
          : {}),
        ...(parent ? { parent } : { root: "1" }),
        limit: String(pageSize),
        offset: String(offset),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref="/map" />;
  }

  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/map" />;
  }

  const body = await res.json();
  const locations = "data" in body ? body.data : [];
  const total =
    "meta" in body && body.meta.total !== undefined ? body.meta.total : locations.length;

  return (
    <PageShell title="starmap" subtitle={`${total} locations`} active="map">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-11 text-overlay0 flex-wrap">
        <a
          href="/map"
          className={
            parent ? "hover:text-text transition-colors duration-180 ease-deliberate" : "text-mauve"
          }
        >
          starmap
        </a>
        {breadcrumb.map((crumb) => (
          <span key={crumb.reference} className="flex items-center gap-1.5">
            <span aria-hidden="true">›</span>
            <a
              href={`/map?parent=${crumb.reference}`}
              className={
                crumb.reference === parent
                  ? "text-mauve"
                  : "hover:text-text transition-colors duration-180 ease-deliberate"
              }
            >
              {crumb.name}
            </a>
          </span>
        ))}
      </nav>

      <FilterBar
        filters={TYPE_FILTERS}
        activeFilters={params}
        basePath="/map"
        currentParams={params}
        className="mb-6"
      />

      <div className="flex flex-col">
        {locations.length === 0 ? (
          <div className="py-8 text-center text-12 text-overlay0">no locations found</div>
        ) : null}
        {locations.map((loc, idx) => (
          <div key={loc.reference}>
            <a
              href={`/map?parent=${loc.reference}`}
              className="group flex items-baseline justify-between gap-3 py-2.5 transition-colors duration-180 ease-deliberate"
            >
              <div className="min-w-0">
                <div className="text-13 text-text truncate group-hover:text-mauve">{loc.name}</div>
                <div className="text-10 tracking-micro uppercase text-overlay0 mt-0.5">
                  {loc.navIcon ?? "location"}
                  {loc.description ? (
                    <span className="normal-case tracking-normal ml-2 text-surface2">
                      {loc.description.slice(0, 80)}
                      {loc.description.length > 80 ? "..." : ""}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-10 text-overlay0 group-hover:text-text shrink-0">→</div>
            </a>
            {idx < locations.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </div>

      {/* pagination */}
      {total > pageSize ? (
        <div className="mt-4 flex items-center justify-between text-11 text-overlay0">
          <span>
            {locations.length} of {total} locations
          </span>
          <div className="flex items-center gap-3">
            {page > 1 ? (
              <a
                href={`/map?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                className="text-subtext0 hover:text-text transition-colors duration-180 ease-deliberate"
              >
                ← prev
              </a>
            ) : (
              <span className="text-surface1">← prev</span>
            )}
            <span className="font-mono text-subtext0">
              {page} / {Math.ceil(total / pageSize)}
            </span>
            {page < Math.ceil(total / pageSize) ? (
              <a
                href={`/map?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                className="text-subtext0 hover:text-text transition-colors duration-180 ease-deliberate"
              >
                next →
              </a>
            ) : (
              <span className="text-surface1">next →</span>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
