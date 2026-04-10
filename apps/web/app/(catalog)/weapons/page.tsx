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
  { key: "type", label: "type", sortable: true },
  { key: "dps", label: "dps", sortable: true, align: "right", mono: true },
  { key: "damageType", label: "dmg type", sortable: true },
  { key: "fireRate", label: "fire rate", sortable: true, align: "right", mono: true },
  { key: "range", label: "range", sortable: true, align: "right", mono: true },
];

const CATEGORY_FILTERS: ReadonlyArray<FilterGroup> = [
  {
    key: "type",
    label: "category",
    options: [
      { label: "ship weapons", value: "weapon" },
      { label: "missiles", value: "missile" },
      { label: "FPS weapons", value: "fps_weapon" },
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
      { label: "S5", value: "5" },
      { label: "S6", value: "6" },
    ],
  },
];

interface WeaponsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function WeaponsPage({ searchParams }: WeaponsPageProps) {
  const raw = searchParams ? await searchParams : {};
  const type = firstString(raw.type) || "weapon";
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
    return <ErrorState code={0} message={message} retryHref="/weapons" />;
  }

  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/weapons" />;
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
        type: item.type ?? item.category,
        dps: s.dps !== undefined ? String(s.dps) : "—",
        damageType: s.damageType ?? "—",
        fireRate: s.fireRate !== undefined ? `${s.fireRate}/s` : "—",
        range: s.range !== undefined ? `${s.range}m` : "—",
      },
    };
  });

  return (
    <PageShell title="weapons" subtitle={`${total} items`} active="weapons">
      <FilterBar
        filters={CATEGORY_FILTERS}
        activeFilters={params}
        basePath="/weapons"
        currentParams={params}
        className="mb-6"
      />
      <DataTable
        columns={COLUMNS}
        rows={rows}
        sortKey={firstString(raw.sort) || undefined}
        sortDir={firstString(raw.dir) === "desc" ? "desc" : "asc"}
        basePath="/weapons"
        currentParams={params}
        totalRows={total}
        currentPage={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
