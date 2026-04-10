import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { commodities } from "./commodities";
import { terminals } from "./terminals";

/**
 * Per-terminal commodity prices — the core trade-route data.
 *
 * Source: uex_commodity_prices.json. 2337 entries linking commodities to
 * terminals with buy/sell prices, SCU availability, and volatility stats.
 *
 * Only the most useful price/SCU columns are stored as discrete fields.
 * The full 111-field UEX payload is too wide for a relational table; the
 * weekly/monthly historical variants are available from UEX API on demand.
 */

export const commodityPrices = sqliteTable(
  "commodity_prices",
  {
    /** UEX numeric id — canonical primary key. */
    id: integer("id").primaryKey(),
    /** FK to commodities.id. */
    idCommodity: integer("id_commodity")
      .notNull()
      .references(() => commodities.id),
    /** FK to terminals.id. */
    idTerminal: integer("id_terminal")
      .notNull()
      .references(() => terminals.id),

    /** Current buy price (aUEC). 0 = not buyable here. */
    priceBuy: integer("price_buy"),
    priceBuyMin: integer("price_buy_min"),
    priceBuyMax: integer("price_buy_max"),
    priceBuyAvg: integer("price_buy_avg"),
    /** Current sell price (aUEC). 0 = not sellable here. */
    priceSell: integer("price_sell"),
    priceSellMin: integer("price_sell_min"),
    priceSellMax: integer("price_sell_max"),
    priceSellAvg: integer("price_sell_avg"),

    /** SCU supply/demand. */
    scuBuy: integer("scu_buy"),
    scuBuyAvg: integer("scu_buy_avg"),
    scuSellStock: integer("scu_sell_stock"),
    scuSell: integer("scu_sell"),
    scuSellAvg: integer("scu_sell_avg"),

    /** Trade status indicators. */
    statusBuy: integer("status_buy"),
    statusSell: integer("status_sell"),
    /** Price volatility (0..1 float). */
    volatilityPriceBuy: real("volatility_price_buy"),
    volatilityPriceSell: real("volatility_price_sell"),

    /** Denormalized names for cheap reads. */
    commodityName: text("commodity_name"),
    commodityCode: text("commodity_code"),
    terminalName: text("terminal_name"),
    starSystemName: text("star_system_name"),

    /** Container sizes CSV. */
    containerSizes: text("container_sizes"),
    /** Game version this price was recorded at. */
    gameVersion: text("game_version"),
    /** UEX timestamps (unix seconds). */
    dateAdded: integer("date_added"),
    dateModified: integer("date_modified"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    commodityIdx: index("idx_commodity_prices_commodity").on(table.idCommodity),
    terminalIdx: index("idx_commodity_prices_terminal").on(table.idTerminal),
    commodityTerminalIdx: index("idx_commodity_prices_commodity_terminal").on(
      table.idCommodity,
      table.idTerminal,
    ),
    priceSellIdx: index("idx_commodity_prices_sell").on(table.priceSell),
    priceBuyIdx: index("idx_commodity_prices_buy").on(table.priceBuy),
  }),
);

export type CommodityPrice = typeof commodityPrices.$inferSelect;
export type NewCommodityPrice = typeof commodityPrices.$inferInsert;
