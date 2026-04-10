import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Trade commodities — metals, gases, drugs, agricultural goods, etc.
 *
 * Source: uex_commodities.json. 191 entries. The `id` mirrors UEX `id` 1:1
 * for reliable joins with `commodity_prices` and terminal data.
 *
 * Boolean flags are stored as a single JSON column rather than 20+ discrete
 * integer columns. The `is_buyable` / `is_sellable` flags determine whether
 * the commodity appears on buy vs sell trade route planners.
 */

export interface CommodityFlagsJson {
  is_available?: boolean;
  is_available_live?: boolean;
  is_visible?: boolean;
  is_extractable?: boolean;
  is_mineral?: boolean;
  is_raw?: boolean;
  is_pure?: boolean;
  is_refined?: boolean;
  is_refinable?: boolean;
  is_harvestable?: boolean;
  is_buyable?: boolean;
  is_sellable?: boolean;
  is_temporary?: boolean;
  is_illegal?: boolean;
  is_volatile_qt?: boolean;
  is_volatile_time?: boolean;
  is_inert?: boolean;
  is_explosive?: boolean;
  is_fuel?: boolean;
  is_buggy?: boolean;
}

export const commodities = sqliteTable(
  "commodities",
  {
    /** UEX numeric id — canonical primary key. */
    id: integer("id").primaryKey(),
    /** Parent commodity id (for hierarchy). */
    idParent: integer("id_parent"),
    /** Display name (e.g. "Agricium"). */
    name: text("name").notNull(),
    /** Short code (e.g. "AGRI"). */
    code: text("code"),
    /** URL-safe slug. */
    slug: text("slug").notNull(),
    /** Commodity kind (e.g. "Metal", "Drug", "Agricultural"). */
    kind: text("kind"),
    /** Weight per SCU. */
    weightScu: real("weight_scu"),
    /** Average buy price in aUEC. */
    priceBuy: integer("price_buy"),
    /** Average sell price in aUEC. */
    priceSell: integer("price_sell"),
    /** Boolean flag bag — all UEX `is_*` fields. */
    flagsJson: text("flags_json", { mode: "json" }).$type<CommodityFlagsJson>(),
    /** Wiki URL. */
    wiki: text("wiki"),
    /** UEX date_added (unix seconds). */
    dateAdded: integer("date_added"),
    /** UEX date_modified (unix seconds). */
    dateModified: integer("date_modified"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    slugUnique: uniqueIndex("uniq_commodities_slug").on(table.slug),
    codeIdx: index("idx_commodities_code").on(table.code),
    kindIdx: index("idx_commodities_kind").on(table.kind),
  }),
);

export type Commodity = typeof commodities.$inferSelect;
export type NewCommodity = typeof commodities.$inferInsert;
