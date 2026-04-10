import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Unified game items table — weapons, shields, coolers, power plants, quantum
 * drives, missiles, mining lasers, modules, utilities, FPS gear, etc.
 *
 * Source priority: erkul (richest stats) ← cstone (shop availability enrichment).
 *
 * The `id` is the item UUID shared between erkul (`data.ref`) and cstone
 * (`ItemId`). Category-specific stats (fire rate, shield regen, cooling rate,
 * etc.) live in the `stats_json` column — there are ~20 different stat shapes
 * across categories, and discrete columns would add 100+ mostly-NULL fields.
 */

export type ItemCategory =
  | "weapon"
  | "shield"
  | "cooler"
  | "power_plant"
  | "quantum_drive"
  | "missile"
  | "mining_laser"
  | "mining_module"
  | "module"
  | "utility"
  | "fps_weapon"
  | "fps_mining"
  | "gadget"
  | "food"
  | "drink"
  | "fps_tool"
  | "fps_tool_attachment"
  | "hacking_chip"
  | "fps_magazine"
  | "fps_attachment"
  | "container";

export const items = sqliteTable(
  "items",
  {
    /** Item UUID from erkul `data.ref` / cstone `ItemId`. */
    id: text("id").primaryKey(),
    /** URL-safe slug generated from name. */
    slug: text("slug").notNull(),
    /** Display name. */
    name: text("name").notNull(),
    /** Normalized category (weapon, shield, cooler, …). */
    category: text("category").$type<ItemCategory>().notNull(),
    /** Manufacturer display name. */
    manufacturer: text("manufacturer"),
    /** Component size class (S0 – S10). */
    size: integer("size"),
    /** Quality grade (A, B, C, D). */
    grade: text("grade"),
    /** Sub-type within category (e.g. "WeaponGun", "BallsticRepeater"). */
    type: text("type"),
    /** Item description from source. */
    description: text("description"),
    /** Category-specific numeric stats (fire rate, shield HP, cooling, etc.). */
    statsJson: text("stats_json", { mode: "json" }),
    /** Source identifier ('erkul' | 'cstone'). */
    source: text("source"),

    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    slugIdx: index("idx_items_slug").on(table.slug),
    categoryIdx: index("idx_items_category").on(table.category),
    manufacturerIdx: index("idx_items_manufacturer").on(table.manufacturer),
    sizeIdx: index("idx_items_size").on(table.size),
    categoryGradeIdx: index("idx_items_category_grade").on(table.category, table.grade),
  }),
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
