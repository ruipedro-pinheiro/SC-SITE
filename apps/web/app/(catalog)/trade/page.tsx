import { ErrorState } from "@/components/error-state";
import { api } from "@/lib/api";
import { DataTable, type DataTableColumn, type DataTableRow, PageShell } from "@sc-site/ui";

export const dynamic = "force-dynamic";

const NUMBER_FMT = new Intl.NumberFormat("en-US");

function fmt(value: number | null): string {
  if (value === null || value === 0) return "—";
  return NUMBER_FMT.format(value).replaceAll(",", " ");
}

const COLUMNS: ReadonlyArray<DataTableColumn> = [
  { key: "name", label: "commodity", sortable: true },
  { key: "kind", label: "kind", sortable: true },
  { key: "buy", label: "buy (aUEC)", sortable: true, align: "right", mono: true },
  { key: "sell", label: "sell (aUEC)", sortable: true, align: "right", mono: true },
  { key: "spread", label: "spread", align: "right", mono: true },
];

interface TradePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function TradePage({ searchParams }: TradePageProps) {
  const raw = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(firstString(raw.page)) || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const params: Record<string, string> = {};

  let res: Awaited<ReturnType<typeof api.commodities.$get>>;
  try {
    res = await api.commodities.$get({
      query: { limit: String(pageSize), offset: String(offset) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref="/trade" />;
  }

  if (!res.ok) {
    return <ErrorState code={res.status} retryHref="/trade" />;
  }

  const body = await res.json();
  const commodities = "data" in body ? body.data : [];
  const total =
    "meta" in body && body.meta.total !== undefined ? body.meta.total : commodities.length;

  const rows: DataTableRow[] = commodities.map((c) => {
    const buy = c.priceBuy;
    const sell = c.priceSell;
    const spread = buy && sell ? sell - buy : null;
    return {
      id: String(c.id),
      cells: {
        name: c.name,
        kind: c.kind ?? "—",
        buy: fmt(buy),
        sell: fmt(sell),
        spread: spread !== null ? fmt(spread) : "—",
      },
    };
  });

  return (
    <PageShell title="trade" subtitle={`${total} commodities`} active="trade">
      <DataTable
        columns={COLUMNS}
        rows={rows}
        sortKey={firstString(raw.sort) || undefined}
        sortDir={firstString(raw.dir) === "desc" ? "desc" : "asc"}
        basePath="/trade"
        currentParams={params}
        totalRows={total}
        currentPage={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
