import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Starmap locations — planets, moons, stations, outposts, POIs, etc.
 *
 * Source: json-out/starmap.json. 1991 entries. Each location has a UUID
 * `reference` used as the primary key and a `parent` UUID forming a tree
 * (star system → planet → moon → station → …).
 *
 * The `type` field is a UUID referencing an internal CIG type definition.
 * The `navIcon` field is a human-readable category string (Planet, Moon,
 * Station, Outpost, LandingZone, Star, Default).
 */

export const locations = sqliteTable(
  "locations",
  {
    /** CIG UUID — canonical primary key. */
    reference: text("reference").primaryKey(),
    /** Display name. */
    name: text("name").notNull(),
    /** Description text. */
    description: text("description"),
    /** CIG type UUID — references an internal type definition. */
    type: text("type"),
    /** Navigation icon category (Planet, Moon, Station, Outpost, LandingZone, Star, Default). */
    navIcon: text("nav_icon"),
    /** Whether this location is hidden in the starmap. */
    hideInStarmap: integer("hide_in_starmap", { mode: "boolean" }).notNull().default(false),
    /** Jurisdiction UUID. */
    jurisdiction: text("jurisdiction"),
    /** Parent location UUID — forms the location tree. */
    parent: text("parent"),
    /** Size value (meaning varies by type). */
    size: real("size"),
    /** CIG source file path. */
    path: text("path"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    nameIdx: index("idx_locations_name").on(table.name),
    navIconIdx: index("idx_locations_nav_icon").on(table.navIcon),
    parentIdx: index("idx_locations_parent").on(table.parent),
    typeIdx: index("idx_locations_type").on(table.type),
  }),
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
