import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { DataTable, type DataTableColumn, type DataTableRow, Input, PageShell } from "@sc-site/ui";

export const dynamic = "force-dynamic";

const COLUMNS: ReadonlyArray<DataTableColumn> = [
  { key: "name", label: "shop / location", sortable: true },
  { key: "items", label: "items", align: "right", mono: true },
];

interface ShopsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ShopsPage({ searchParams }: ShopsPageProps) {
  const raw = searchParams ? await searchParams : {};
  const q = firstString(raw.q);
  const page = Math.max(1, Number(firstString(raw.page)) || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const params: Record<string, string> = {};
  if (q) params.q = q;

  let res: Awaited<ReturnType<typeof api.shops.$get>>;
  try {
    res = await api.shops.$get({
      query: {
        ...(q ? { q } : {}),
        limit: String(pageSize),
        offset: String(offset),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref="/shops" />;
  }

  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/shops" />;
  }

  const body = await res.json();
  const shops = "data" in body ? body.data : [];
  const total = "meta" in body && body.meta.total !== undefined ? body.meta.total : shops.length;

  const rows: DataTableRow[] = shops.map((shop) => ({
    id: String(shop.id),
    href: `/shops/${shop.id}`,
    cells: {
      name: shop.name,
      items: String(shop.itemCount),
    },
  }));

  return (
    <PageShell title="shops" subtitle={`${total} locations`} active="shops">
      <form action="/shops" className="mb-6">
        <Input
          type="text"
          name="q"
          defaultValue={q}
          aria-label="search shops"
          placeholder="search by shop name or location..."
        />
      </form>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        sortKey={firstString(raw.sort) || undefined}
        sortDir={firstString(raw.dir) === "desc" ? "desc" : "asc"}
        basePath="/shops"
        currentParams={params}
        totalRows={total}
        currentPage={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
