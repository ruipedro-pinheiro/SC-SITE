import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Shops — physical store locations in the Star Citizen universe.
 *
 * Source: cstone_all.json `shops` dict. Keys are location path strings like
 * "Stanton - Hurston - Lorville - Tammany And Sons". Each shop sells a set
 * of items tracked in `shop_inventory`.
 */

export const shops = sqliteTable(
  "shops",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Full location path (e.g. "Stanton - Hurston - Lorville - Tammany And Sons"). */
    name: text("name").notNull(),
    /** URL-safe slug derived from name. */
    slug: text("slug").notNull(),
    /** Source identifier ('cstone'). */
    source: text("source"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    nameUnique: uniqueIndex("uniq_shops_name").on(table.name),
    slugIdx: uniqueIndex("uniq_shops_slug").on(table.slug),
  }),
);

export type Shop = typeof shops.$inferSelect;
export type NewShop = typeof shops.$inferInsert;
