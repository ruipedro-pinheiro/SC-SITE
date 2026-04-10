import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { vehicles } from "./vehicles";

/**
 * Hardpoints — one row per *hardpoint base*, NOT per gun barrel.
 *
 * The CryEngine canonical structure is hierarchical: a size-5 manned turret
 * base mounts 2× size-4 gun children. That's ONE hardpoint row with
 * `size = 5, mount_count = 2, type = 'manned turret'`. The Carrack's 8× S4
 * pilot/turret guns become 4 rows (4 turret bases), not 8. The API layer
 * decides whether to aggregate or expand for display.
 *
 * Source priority: erkul (loadout port tree) ← scunpacked ← Wiki weapon
 * snapshot. UEX has no equivalent — null fallback there.
 *
 * The optional `weapon_item_id` will be filled in once items are ingested and
 * the hardpoint→item join can be resolved. Until then, `default_weapon_name`
 * carries the free-form display string from erkul.
 */

/** Where the hardpoint lives on the hull. Mirrors the UI Hardpoint.location enum + extras. */
export type HardpointLocation =
  | "nose"
  | "dorsal"
  | "belly"
  | "chin"
  | "wing"
  | "side"
  | "missile"
  | "hull"
  | "interior";

/** Mount type. Mirrors the UI HardpointMountKind plus 'utility' for tractor beams etc. */
export type HardpointType =
  | "pilot fixed"
  | "pilot gimbal"
  | "manned"
  | "manned turret"
  | "remote turret"
  | "rack"
  | "utility";

export const hardpoints = sqliteTable(
  "hardpoints",
  {
    /** Composite stable id, e.g. "drak-corsair_dorsal-1" or a ULID. */
    id: text("id").primaryKey(),
    /** Owning vehicle (cascades on delete). */
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    /** Where the mount lives on the hull. */
    location: text("location").$type<HardpointLocation>().notNull(),
    /** Mount type (pilot vs turret vs rack vs utility). */
    type: text("type").$type<HardpointType>().notNull(),
    /** Weapon size class S1 – S10. */
    size: integer("size").notNull(),
    /**
     * Number of child mounts on this base. A bare gun = 1. A turret with 2
     * children = 2. The Carrack's 8× S4 manned guns = four rows of
     * `size: 5, mount_count: 2`.
     */
    mountCount: integer("mount_count").notNull().default(1),
    /** FK to items.id once item ingestion lands. Free now until items table exists. */
    weaponItemId: integer("weapon_item_id"),
    /** Free-form fallback display name from erkul. */
    defaultWeaponName: text("default_weapon_name"),
    /** Source label so the UI can badge per-row. */
    source: text("source"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    vehicleIdx: index("idx_hardpoints_vehicle").on(table.vehicleId),
    vehicleLocationIdx: index("idx_hardpoints_vehicle_location").on(
      table.vehicleId,
      table.location,
    ),
    weaponItemIdx: index("idx_hardpoints_weapon_item").on(table.weaponItemId),
  }),
);

export type Hardpoint = typeof hardpoints.$inferSelect;
export type NewHardpoint = typeof hardpoints.$inferInsert;
