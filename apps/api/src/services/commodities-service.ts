/**
 * Commodity read service — Drizzle queries for commodities and their
 * per-terminal prices. Route handlers call these functions; they never
 * import `@sc-site/db` directly.
 */

import {
  type Commodity,
  type CommodityPrice,
  commodities as commoditiesTable,
  commodityPrices as commodityPricesTable,
  db,
} from "@sc-site/db";
import { eq, sql } from "drizzle-orm";

export interface CommodityListFilters {
  limit: number;
  offset: number;
}

export interface CommodityListResult {
  commodities: Commodity[];
  total: number;
}

export async function listCommodities(filters: CommodityListFilters): Promise<CommodityListResult> {
  const rows = await db.select().from(commoditiesTable).limit(filters.limit).offset(filters.offset);

  const countRows = await db.select({ c: sql<number>`count(*)` }).from(commoditiesTable);
  const total = countRows[0]?.c ?? 0;

  return { commodities: rows, total };
}

export async function getCommodityById(id: number): Promise<Commodity | undefined> {
  const [row] = await db
    .select()
    .from(commoditiesTable)
    .where(eq(commoditiesTable.id, id))
    .limit(1);
  return row;
}

export async function getCommodityPrices(commodityId: number): Promise<CommodityPrice[]> {
  return db
    .select()
    .from(commodityPricesTable)
    .where(eq(commodityPricesTable.idCommodity, commodityId));
}
