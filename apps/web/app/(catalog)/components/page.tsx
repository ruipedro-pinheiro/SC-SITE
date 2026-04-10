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

const BASE_COLUMNS: ReadonlyArray<DataTableColumn> = [
  { key: "name", label: "name", sortable: true },
  { key: "manufacturer", label: "manufacturer", sortable: true },
  { key: "size", label: "size", sortable: true, align: "right", mono: true },
  { key: "grade", label: "grade", sortable: true },
];

const STAT_COLUMNS: Record<string, ReadonlyArray<DataTableColumn>> = {
  shield: [
    { key: "shieldHp", label: "shield hp", sortable: true, align: "right", mono: true },
    { key: "regenRate", label: "regen/s", sortable: true, align: "right", mono: true },
  ],
  quantum_drive: [
    { key: "qtSpeed", label: "qt speed", sortable: true, align: "right", mono: true },
    { key: "spoolTime", label: "spool (s)", sortable: true, align: "right", mono: true },
    { key: "qtFuelRate", label: "fuel rate", sortable: true, align: "right", mono: true },
  ],
  power_plant: [
    { key: "powerOutput", label: "power output", sortable: true, align: "right", mono: true },
  ],
  cooler: [
    { key: "coolingRate", label: "cooling rate", sortable: true, align: "right", mono: true },
  ],
};

const CATEGORY_FILTERS: ReadonlyArray<FilterGroup> = [
  {
    key: "type",
    label: "type",
    options: [
      { label: "shields", value: "shield" },
      { label: "coolers", value: "cooler" },
      { label: "quantum drives", value: "quantum_drive" },
      { label: "power plants", value: "power_plant" },
    ],
  },
  {
    key: "size",
    label: "size",
    options: [
      { label: "S1", value: "1" },
      { label: "S2", value: "2" },
      { label: "S3", value: "3" },
      { label: "S4", value: "4" },
    ],
  },
];

interface ComponentsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ComponentsPage({ searchParams }: ComponentsPageProps) {
  const raw = searchParams ? await searchParams : {};
  const type = firstString(raw.type) || "shield";
  const size = firstString(raw.size);
  const page = Math.max(1, Number(firstString(raw.page)) || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const params: Record<string, string> = {};
  if (type) params.type = type;
  if (size) params.size = size;

  let res: Awaited<ReturnType<typeof api.items.$get>>;
  try {
    res = await api.items.$get({
      query: {
        type,
        ...(size ? { size } : {}),
        limit: String(pageSize),
        offset: String(offset),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref="/components" />;
  }

  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/components" />;
  }

  const body = await res.json();
  const items = "data" in body ? body.data : [];
  const total = "meta" in body && body.meta.total !== undefined ? body.meta.total : items.length;

  const extraCols = STAT_COLUMNS[type] ?? [];
  const columns = [...BASE_COLUMNS, ...extraCols];

  const rows: DataTableRow[] = items.map((item) => {
    const s = item.stats;
    const baseCells: Record<string, string> = {
      name: item.name,
      manufacturer: item.manufacturer ?? "—",
      size: item.size !== null ? `S${item.size}` : "—",
      grade: item.grade ?? "—",
    };

    if (type === "shield") {
      baseCells.shieldHp = s.shieldHp !== undefined ? String(s.shieldHp) : "—";
      baseCells.regenRate = s.regenRate !== undefined ? `${s.regenRate}` : "—";
    } else if (type === "quantum_drive") {
      baseCells.qtSpeed = s.qtSpeed !== undefined ? `${(s.qtSpeed / 1_000_000).toFixed(1)}M` : "—";
      baseCells.spoolTime = s.spoolTime !== undefined ? String(s.spoolTime) : "—";
      baseCells.qtFuelRate = s.qtFuelRate !== undefined ? String(s.qtFuelRate) : "—";
    } else if (type === "power_plant") {
      baseCells.powerOutput = s.powerOutput !== undefined ? String(s.powerOutput) : "—";
    } else if (type === "cooler") {
      baseCells.coolingRate = s.coolingRate !== undefined ? String(s.coolingRate) : "—";
    }

    return { id: item.id, cells: baseCells };
  });

  return (
    <PageShell title="components" subtitle={`${total} items`} active="components">
      <FilterBar
        filters={CATEGORY_FILTERS}
        activeFilters={params}
        basePath="/components"
        currentParams={params}
        className="mb-6"
      />
      <DataTable
        columns={columns}
        rows={rows}
        sortKey={firstString(raw.sort) || undefined}
        sortDir={firstString(raw.dir) === "desc" ? "desc" : "asc"}
        basePath="/components"
        currentParams={params}
        totalRows={total}
        currentPage={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
