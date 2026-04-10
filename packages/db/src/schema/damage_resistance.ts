import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { vehicles } from "./vehicles";

/**
 * Per-vehicle damage resistance multipliers — the "psychopath differentiator"
 * column group from INGESTION.md §1.b.
 *
 * The Hono read layer aggregates `component_damage_map` rows over a vehicle's
 * loadout to compute this profile (weighted by component HP). This table
 * stores the *materialized* per-vehicle result so the catalog page doesn't
 * have to do the join+sum on every request. The aggregator writes one row
 * per (vehicle_id, damage_type).
 *
 * Source reference text records WHICH provider+timestamp produced the value
 * (e.g. "scunpacked 2026-04-08 + erkul loadout default 2026-04-07").
 */

export type DamageType = "physical" | "distortion" | "energy" | "thermal" | "biochemical";

export const damageResistance = sqliteTable(
  "damage_resistance",
  {
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    damageType: text("damage_type").$type<DamageType>().notNull(),
    /** Damage taken multiplier. 1.0 = neutral, <1 = resistant, >1 = weak. Range 0..2. */
    multiplier: real("multiplier").notNull(),
    /** Free-form provenance string ("scunpacked 2026-04-08 + erkul loadout"). */
    sourceReference: text("source_reference"),
    /** Optional pre-computed bar fill 0..100 to skip a divide on the client. */
    fillPct: real("fill_pct"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.vehicleId, table.damageType] }),
    vehicleIdx: index("idx_damage_resistance_vehicle").on(table.vehicleId),
    typeIdx: index("idx_damage_resistance_type").on(table.damageType),
  }),
);

export type DamageResistanceRow = typeof damageResistance.$inferSelect;
export type NewDamageResistanceRow = typeof damageResistance.$inferInsert;
