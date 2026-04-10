import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { shops } from "./shops";

/**
 * Shop inventory — junction table linking shops to the items they sell.
 *
 * Source: cstone_all.json `shops` dict (601 shop names → item arrays).
 * Each entry records what a shop sells and at what price.
 *
 * `item_id` is a soft reference to `items.id` (UUID). Not all shop items
 * exist in the items table (e.g. FPS consumables), so we denormalize the
 * display fields and skip the hard FK.
 */

export const shopInventory = sqliteTable(
  "shop_inventory",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** FK to shops.id (cascades on delete). */
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    /** Item UUID — soft reference to items.id. */
    itemId: text("item_id"),
    /** Denormalized item display name. */
    itemName: text("item_name"),
    /** Denormalized item type/category string from source. */
    itemType: text("item_type"),
    /** Item size (nullable — FPS items lack it). */
    itemSize: integer("item_size"),
    /** Price in aUEC. */
    price: integer("price"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    shopIdx: index("idx_shop_inventory_shop").on(table.shopId),
    itemIdx: index("idx_shop_inventory_item").on(table.itemId),
    shopItemIdx: index("idx_shop_inventory_shop_item").on(table.shopId, table.itemId),
  }),
);

export type ShopInventoryRow = typeof shopInventory.$inferSelect;
export type NewShopInventoryRow = typeof shopInventory.$inferInsert;
