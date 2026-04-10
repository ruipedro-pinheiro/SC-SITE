import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Manufacturers (a.k.a. companies in UEX terminology).
 *
 * Source priority: UEX `companies` ← Wiki manufacturer page. UEX is the only
 * place that exposes a numeric `id_company` we can foreign-key from
 * `vehicles.manufacturer_id`, so the integer pk mirrors UEX `id` 1:1.
 *
 * NO HARDCODE: rows arrive exclusively from the ingestion fetchers. Schemas
 * never define seed data.
 */
export const manufacturers = sqliteTable(
  "manufacturers",
  {
    id: integer("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameCode: text("name_code"),
    country: text("country"),
    foundedYear: integer("founded_year"),
    logoUrl: text("logo_url"),
    wikiUrl: text("wiki_url"),
    storeUrl: text("store_url"),
    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    slugIdx: index("idx_manufacturers_slug").on(table.slug),
    nameCodeIdx: index("idx_manufacturers_name_code").on(table.nameCode),
  }),
);

export type Manufacturer = typeof manufacturers.$inferSelect;
export type NewManufacturer = typeof manufacturers.$inferInsert;
