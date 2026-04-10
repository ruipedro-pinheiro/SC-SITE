/**
 * Shop read service — Drizzle queries for shops and their inventory.
 * Route handlers call these functions; they never import `@sc-site/db`
 * directly.
 */

import {
  type Shop,
  type ShopInventoryRow,
  db,
  shopInventory as shopInventoryTable,
  shops as shopsTable,
} from "@sc-site/db";
import { eq, inArray, like, sql } from "drizzle-orm";

export interface ShopListFilters {
  /** Free-text filter on shop name (shop names include system/location path). */
  q?: string;
  limit: number;
  offset: number;
}

export interface ShopListResult {
  shops: Array<Shop & { itemCount: number }>;
  total: number;
}

export interface ShopDetail {
  shop: Shop;
  inventory: ShopInventoryRow[];
}

export async function listShops(filters: ShopListFilters): Promise<ShopListResult> {
  const rowsQuery = db.select().from(shopsTable).limit(filters.limit).offset(filters.offset);

  const whereClause = filters.q ? like(shopsTable.name, `%${filters.q}%`) : undefined;

  const rows = whereClause ? await rowsQuery.where(whereClause) : await rowsQuery;

  const countRows = await (whereClause
    ? db.select({ c: sql<number>`count(*)` }).from(shopsTable).where(whereClause)
    : db.select({ c: sql<number>`count(*)` }).from(shopsTable));
  const total = countRows[0]?.c ?? 0;

  if (rows.length === 0) {
    return { shops: [], total };
  }

  const shopIds = rows.map((r) => r.id);
  const inventoryCounts = await db
    .select({
      shopId: shopInventoryTable.shopId,
      count: sql<number>`count(*)`,
    })
    .from(shopInventoryTable)
    .where(inArray(shopInventoryTable.shopId, shopIds))
    .groupBy(shopInventoryTable.shopId);

  const countMap = new Map(inventoryCounts.map((c) => [c.shopId, c.count]));
  const shops = rows.map((r) => ({ ...r, itemCount: countMap.get(r.id) ?? 0 }));

  return { shops, total };
}

export async function getShopById(id: number): Promise<ShopDetail | null> {
  const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, id)).limit(1);

  if (!shop) return null;

  const inventory = await db
    .select()
    .from(shopInventoryTable)
    .where(eq(shopInventoryTable.shopId, shop.id));

  return { shop, inventory };
}
