import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Trade terminals — physical locations where commodities can be bought/sold.
 *
 * Source: uex_terminals.json. 824 entries. The `id` mirrors UEX `id` 1:1
 * for reliable joins with `commodity_prices`.
 *
 * Location hierarchy IDs and denormalized name strings are both stored so
 * the API can filter by location without expensive joins while still
 * supporting drill-down navigation.
 */

export interface TerminalFlagsJson {
  is_available?: boolean;
  is_available_live?: boolean;
  is_visible?: boolean;
  is_default_system?: boolean;
  is_affinity_influenceable?: boolean;
  is_habitation?: boolean;
  is_refinery?: boolean;
  is_cargo_center?: boolean;
  is_medical?: boolean;
  is_food?: boolean;
  is_shop_fps?: boolean;
  is_shop_vehicle?: boolean;
  is_refuel?: boolean;
  is_repair?: boolean;
  is_nqa?: boolean;
  is_jump_point?: boolean;
  is_player_owned?: boolean;
  is_auto_load?: boolean;
  has_loading_dock?: boolean;
  has_docking_port?: boolean;
  has_freight_elevator?: boolean;
}

export const terminals = sqliteTable(
  "terminals",
  {
    /** UEX numeric id — canonical primary key. */
    id: integer("id").primaryKey(),
    /** Short name (e.g. "Admin - ARC-L1"). */
    name: text("name").notNull(),
    /** Full name including type prefix (e.g. "Commodity Shop - Admin - ARC-L1"). */
    fullname: text("fullname"),
    /** Nickname (e.g. "ARC-L1"). */
    nickname: text("nickname"),
    /** Display name (e.g. "ARC-L1 Wide Forest Station"). */
    displayname: text("displayname"),
    /** Short code (e.g. "ARCL1"). */
    code: text("code"),
    /** URL-safe slug. */
    slug: text("slug").notNull(),
    /** Terminal type (e.g. "commodity", "vehicle"). */
    type: text("type"),

    /** Location hierarchy IDs for filtering. */
    idStarSystem: integer("id_star_system"),
    idPlanet: integer("id_planet"),
    idOrbit: integer("id_orbit"),
    idMoon: integer("id_moon"),
    idSpaceStation: integer("id_space_station"),
    idOutpost: integer("id_outpost"),
    idCity: integer("id_city"),
    idFaction: integer("id_faction"),
    idCompany: integer("id_company"),

    /** Denormalized location names for cheap reads. */
    starSystemName: text("star_system_name"),
    planetName: text("planet_name"),
    orbitName: text("orbit_name"),
    moonName: text("moon_name"),
    spaceStationName: text("space_station_name"),
    outpostName: text("outpost_name"),
    cityName: text("city_name"),
    factionName: text("faction_name"),
    companyName: text("company_name"),

    /** Boolean flag bag. */
    flagsJson: text("flags_json", { mode: "json" }).$type<TerminalFlagsJson>(),
    /** Max container size accepted. */
    maxContainerSize: integer("max_container_size"),
    /** MCS flag. */
    mcs: integer("mcs"),
    /** UEX game version. */
    gameVersion: text("game_version"),
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
    slugUnique: uniqueIndex("uniq_terminals_slug").on(table.slug),
    codeIdx: index("idx_terminals_code").on(table.code),
    typeIdx: index("idx_terminals_type").on(table.type),
    starSystemIdx: index("idx_terminals_star_system").on(table.idStarSystem),
    planetIdx: index("idx_terminals_planet").on(table.idPlanet),
  }),
);

export type Terminal = typeof terminals.$inferSelect;
export type NewTerminal = typeof terminals.$inferInsert;
