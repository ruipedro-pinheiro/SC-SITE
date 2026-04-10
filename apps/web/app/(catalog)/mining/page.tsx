import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
  FilterBar,
  type FilterGroup,
  PageShell,
} from "@sc-site/ui";

export const dynamic = "force-dynamic";

const COLUMNS: ReadonlyArray<DataTableColumn> = [
  { key: "name", label: "name", sortable: true },
  { key: "manufacturer", label: "manufacturer", sortable: true },
  { key: "size", label: "size", sortable: true, align: "right", mono: true },
  { key: "category", label: "type" },
  { key: "miningPower", label: "power", sortable: true, align: "right", mono: true },
  { key: "instability", label: "instability", sortable: true, align: "right", mono: true },
  { key: "resistance", label: "resistance", sortable: true, align: "right", mono: true },
  { key: "range", label: "range", sortable: true, align: "right", mono: true },
];

const CATEGORY_FILTERS: ReadonlyArray<FilterGroup> = [
  {
    key: "type",
    label: "type",
    options: [
      { label: "mining lasers", value: "mining_laser" },
      { label: "mining modules", value: "mining_module" },
    ],
  },
];

interface MiningPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function MiningPage({ searchParams }: MiningPageProps) {
  const raw = searchParams ? await searchParams : {};
  const type = firstString(raw.type) || "mining_laser";
  const page = Math.max(1, Number(firstString(raw.page)) || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const params: Record<string, string> = {};
  if (type) params.type = type;

  let res: Awaited<ReturnType<typeof api.items.$get>>;
  try {
    res = await api.items.$get({
      query: {
        type,
        limit: String(pageSize),
        offset: String(offset),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref="/mining" />;
  }

  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/mining" />;
  }

  const body = await res.json();
  const items = "data" in body ? body.data : [];
  const total = "meta" in body && body.meta.total !== undefined ? body.meta.total : items.length;

  const rows: DataTableRow[] = items.map((item) => {
    const s = item.stats;
    return {
      id: item.id,
      cells: {
        name: item.name,
        manufacturer: item.manufacturer ?? "—",
        size: item.size !== null ? `S${item.size}` : "—",
        category: item.category,
        miningPower: s.miningPower !== undefined ? String(s.miningPower) : "—",
        instability: s.miningInstability !== undefined ? String(s.miningInstability) : "—",
        resistance: s.miningResistance !== undefined ? String(s.miningResistance) : "—",
        range: s.range !== undefined ? `${s.range}m` : "—",
      },
    };
  });

  return (
    <PageShell title="mining" subtitle={`${total} items`} active="mining">
      <FilterBar
        filters={CATEGORY_FILTERS}
        activeFilters={params}
        basePath="/mining"
        currentParams={params}
        className="mb-6"
      />
      <DataTable
        columns={COLUMNS}
        rows={rows}
        sortKey={firstString(raw.sort) || undefined}
        sortDir={firstString(raw.dir) === "desc" ? "desc" : "asc"}
        basePath="/mining"
        currentParams={params}
        totalRows={total}
        currentPage={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
