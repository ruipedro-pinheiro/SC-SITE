import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { DataTable, type DataTableColumn, type DataTableRow, PageShell } from "@sc-site/ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const NUMBER_FMT = new Intl.NumberFormat("en-US");

function fmtPrice(value: number | null): string {
  if (value === null || value === 0) return "—";
  return NUMBER_FMT.format(value).replaceAll(",", " ");
}

const COLUMNS: ReadonlyArray<DataTableColumn> = [
  { key: "name", label: "item", sortable: true },
  { key: "type", label: "type", sortable: true },
  { key: "size", label: "size", align: "right", mono: true },
  { key: "price", label: "price (aUEC)", align: "right", mono: true },
];

interface ShopDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShopDetailPage({ params }: ShopDetailPageProps) {
  const { slug } = await params;

  let res: Awaited<ReturnType<(typeof api.shops)[":id"]["$get"]>>;
  try {
    res = await api.shops[":id"].$get({ param: { id: slug } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref="/shops" />;
  }

  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/shops" />;
  }

  const body = await res.json();
  if (!("data" in body)) {
    return <ErrorState code={res.status} retryHref="/shops" />;
  }

  const shop = body.data;
  const inventory = shop.inventory;

  const rows: DataTableRow[] = inventory.map((item) => ({
    id: String(item.id),
    cells: {
      name: item.itemName ?? "unknown",
      type: item.itemType ?? "—",
      size: item.itemSize !== null ? String(item.itemSize) : "—",
      price: fmtPrice(item.price),
    },
  }));

  return (
    <PageShell title={shop.name} subtitle={`${inventory.length} items`} active="shops">
      <div className="mb-4">
        <a
          href="/shops"
          className="text-11 text-overlay0 hover:text-text transition-colors duration-180 ease-deliberate"
        >
          ← back to shops
        </a>
      </div>
      <DataTable
        columns={COLUMNS}
        rows={rows}
        basePath={`/shops/${slug}`}
        totalRows={inventory.length}
      />
    </PageShell>
  );
}
