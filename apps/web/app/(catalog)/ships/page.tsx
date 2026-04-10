import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { BottomTextNav, FilterBar, type FilterGroup, Input, PanelShell, TopNav } from "@sc-site/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

const SIZE_OPTIONS = [
  { label: "snub", value: "Snub" },
  { label: "small", value: "Small" },
  { label: "medium", value: "Medium" },
  { label: "large", value: "Large" },
  { label: "capital", value: "Capital" },
];

const STATUS_OPTIONS = [
  { label: "flyable", value: "flyable" },
  { label: "concept", value: "concept" },
  { label: "buyable in-game", value: "buyable" },
];

function formatAuecShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(value);
}

interface HangarPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

function normalize(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

export default async function HangarPage({ searchParams }: HangarPageProps) {
  const raw = searchParams ? await searchParams : {};
  const q = normalize(raw.q);
  const sizeFilter = normalize(raw.size);
  const statusFilter = normalize(raw.status);
  const sortParam = normalize(raw.sort);
  const page = Math.max(1, Number(normalize(raw.page)) || 1);

  // Build API query with server-side filters
  const apiQuery: Record<string, string> = { limit: "500" };
  if (statusFilter === "flyable") apiQuery.is_concept = "false";
  else if (statusFilter === "concept") apiQuery.is_concept = "true";
  else if (statusFilter === "buyable") apiQuery.buyable = "true";
  if (sortParam === "price-asc" || sortParam === "price-desc" || sortParam === "name") {
    apiQuery.sort = sortParam;
  }

  let res: Awaited<ReturnType<typeof api.vehicles.$get>>;
  try {
    res = await api.vehicles.$get({ query: apiQuery });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref="/ships" />;
  }

  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/ships" />;
  }

  const body = await res.json();
  const allShips = "data" in body ? body.data : [];

  // Apply filters
  const qLower = q.toLowerCase();
  let filtered = allShips;
  if (qLower) {
    filtered = filtered.filter((s) =>
      [s.name, s.manufacturer, s.slug, s.role]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(qLower)),
    );
  }
  if (sizeFilter) {
    filtered = filtered.filter((s) => s.size === sizeFilter);
  }

  // Pagination
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageShips = filtered.slice(start, start + PAGE_SIZE);

  // Build current params for filter links
  const currentParams: Record<string, string> = {};
  if (q) currentParams.q = q;
  if (sizeFilter) currentParams.size = sizeFilter;
  if (statusFilter) currentParams.status = statusFilter;
  if (sortParam) currentParams.sort = sortParam;

  const SORT_OPTIONS = [
    { label: "name", value: "name" },
    { label: "price ↑", value: "price-asc" },
    { label: "price ↓", value: "price-desc" },
  ];

  const filters: FilterGroup[] = [
    { key: "size", label: "size", options: SIZE_OPTIONS },
    { key: "status", label: "status", options: STATUS_OPTIONS },
    { key: "sort", label: "sort", options: SORT_OPTIONS },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-crust">
      <TopNav centerLabel="HANGAR" centerSub={`${totalFiltered} ships`} />

      {/* search + filters */}
      <div className="relative z-20 mx-auto mt-20 px-6 max-w-7xl">
        <div className="flex flex-col gap-4 mb-6">
          <form action="/ships" className="relative max-w-md">
            <Input
              type="text"
              name="q"
              defaultValue={q}
              aria-label="search ships"
              placeholder="search by name, manufacturer, role..."
            />
          </form>
          <FilterBar
            filters={filters}
            activeFilters={currentParams}
            basePath="/ships"
            currentParams={currentParams}
          />
        </div>

        {/* ship grid */}
        {pageShips.length === 0 ? (
          <PanelShell className="max-w-md mx-auto px-8 py-6 text-center">
            <div className="text-14 text-text">no ships match your filters</div>
            <a href="/ships" className="text-12 text-mauve mt-2 inline-block">
              clear filters
            </a>
          </PanelShell>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageShips.map((ship) => (
              <a
                key={ship.slug}
                href={`/ships/${ship.slug}`}
                className="group panel p-0 overflow-hidden flex flex-col hover:border-mauve/40 transition-colors duration-180 ease-deliberate"
              >
                {/* ship photo */}
                {ship.photo ? (
                  <div className="w-full aspect-[16/9] overflow-hidden bg-mantle">
                    <img
                      src={ship.photo}
                      alt={ship.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-220 ease-deliberate"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[16/9] bg-mantle flex items-center justify-center">
                    <span className="text-11 text-overlay0 tracking-micro uppercase">no image</span>
                  </div>
                )}

                {/* ship info */}
                <div className="p-4 flex flex-col gap-1.5 flex-1">
                  <div className="text-14 text-text font-medium group-hover:text-mauve transition-colors duration-180">
                    {ship.name}
                  </div>
                  <div className="text-11 tracking-micro text-overlay0 uppercase">
                    {ship.manufacturer} · {ship.size}
                  </div>

                  {/* role + stats on one line */}
                  <div className="flex items-center gap-3 text-11 text-subtext0 mt-1 flex-wrap">
                    {ship.role ? <span>{ship.role}</span> : null}
                    <span className="text-overlay0">·</span>
                    {ship.scu > 0 ? <span className="font-mono">{ship.scu} SCU</span> : null}
                    <span className="font-mono">
                      {ship.crewMin}–{ship.crewMax} crew
                    </span>
                  </div>
                  {ship.buyPriceAuec !== undefined && ship.buyPriceAuec > 0 ? (
                    <div className="text-11 font-mono text-peach mt-1">
                      {formatAuecShort(ship.buyPriceAuec)} aUEC
                    </div>
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 ? (
          <div className="mt-6 mb-16 flex items-center justify-center gap-4 text-12 text-subtext0">
            {safePage > 1 ? (
              <a
                href={`/ships?${new URLSearchParams({ ...currentParams, page: String(safePage - 1) }).toString()}`}
                className="hover:text-text transition-colors duration-180 ease-deliberate"
              >
                ← prev
              </a>
            ) : (
              <span className="text-surface1">← prev</span>
            )}
            <span className="font-mono text-overlay0">
              {safePage} / {totalPages}
            </span>
            {safePage < totalPages ? (
              <a
                href={`/ships?${new URLSearchParams({ ...currentParams, page: String(safePage + 1) }).toString()}`}
                className="hover:text-text transition-colors duration-180 ease-deliberate"
              >
                next →
              </a>
            ) : (
              <span className="text-surface1">next →</span>
            )}
          </div>
        ) : (
          <div className="mb-16" />
        )}
      </div>

      <BottomTextNav active="hangar" />
    </main>
  );
}
