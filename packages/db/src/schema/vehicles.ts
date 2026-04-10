import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { manufacturers } from "./manufacturers";

/**
 * Canonical Vehicle row — ships AND ground vehicles, separated by the
 * `is_ground_vehicle` flag (per INGESTION.md §1: a single table, flag-split).
 *
 * Source priority (see INGESTION.md §2.Vehicle):
 *   - `id`, `slug`, `name`, manufacturer, flag bools ← UEX (canonical economy)
 *   - dimensions, mass, crew, lore ← Wiki ← erkul fallback
 *   - hardpoints, default loadout, hull HP tree ← erkul (richest)
 *   - canonical hero image ← downloaded once from RSI ship-matrix
 *
 * NO HARDCODE: every row is upserted by the ingestion layer; the schema only
 * declares the shape. The `id` column intentionally mirrors UEX `id` because
 * UEX is the source of truth for vehicle existence — other sources enrich.
 */

/** Size class as exposed in the UI Ship.size shape. */
export type VehicleSizeClass = "Snub" | "Small" | "Medium" | "Large" | "Capital";

/**
 * The full UEX boolean flag bag, kept as a single JSON column instead of 35+
 * discrete `is_*` integer columns. Field names match UEX response keys 1:1.
 */
export interface VehicleFlagsJson {
  is_addon?: boolean;
  is_boarding?: boolean;
  is_bomber?: boolean;
  is_cargo?: boolean;
  is_carrier?: boolean;
  is_civilian?: boolean;
  is_concept?: boolean;
  is_construction?: boolean;
  is_datarunner?: boolean;
  is_docking?: boolean;
  is_emp?: boolean;
  is_exploration?: boolean;
  is_ground_vehicle?: boolean;
  is_hangar?: boolean;
  is_industrial?: boolean;
  is_interdiction?: boolean;
  is_loading_dock?: boolean;
  is_medical?: boolean;
  is_military?: boolean;
  is_mining?: boolean;
  is_passenger?: boolean;
  is_qed?: boolean;
  is_quantum_capable?: boolean;
  is_racing?: boolean;
  is_refinery?: boolean;
  is_refuel?: boolean;
  is_repair?: boolean;
  is_research?: boolean;
  is_salvage?: boolean;
  is_scanning?: boolean;
  is_science?: boolean;
  is_showdown_winner?: boolean;
  is_spaceship?: boolean;
  is_starter?: boolean;
  is_stealth?: boolean;
  is_tractor_beam?: boolean;
}

/**
 * Free-form aggregate URL bag, populated entirely from UEX. The web layer
 * decides which to surface and where; the DB just stores them.
 */
export interface VehicleImageExtrasJson {
  url_photo?: string;
  url_photos?: string;
  url_brochure?: string;
  url_hotsite?: string;
  url_video?: string;
}

/**
 * Container size CSV from UEX (e.g. "1,2,4,8") parsed into a numeric array.
 * Stored as JSON so SQLite stays simple and the web layer can iterate without
 * a custom parser.
 */
export type VehicleContainerSizesJson = ReadonlyArray<number>;

export const vehicles = sqliteTable(
  "vehicles",
  {
    /** UEX numeric id — canonical primary key. */
    id: integer("id").primaryKey(),
    /** RSI internal uuid (cross-source join key). Nullable because some UEX rows lack it. */
    uuid: text("uuid"),
    /** Canonical slug used by the URL router and cross-source joins. */
    slug: text("slug").notNull(),
    /** Display name from UEX. */
    name: text("name").notNull(),
    /** Long marketing name (UEX `name_full`, fallback Wiki). */
    nameFull: text("name_full"),
    /** FK to manufacturers (UEX `id_company`). Nullable to survive missing mfr rows. */
    manufacturerId: integer("manufacturer_id").references(() => manufacturers.id),
    /** Cached manufacturer display name from UEX `company_name` (denormalized for cheap reads). */
    manufacturerName: text("manufacturer_name"),
    /** Career/role string from erkul → Wiki → UEX. Free-form; the UI bins it. */
    role: text("role"),
    /** Discrete size class (Snub | Small | Medium | Large | Capital). */
    size: text("size").$type<VehicleSizeClass>(),

    /** Hull dimensions in metres. */
    length: real("length"),
    beam: real("beam"),
    height: real("height"),

    /** Empty mass in kilograms. */
    massEmptyKg: integer("mass_empty_kg"),

    /** Cargo grid capacity in standard cargo units. */
    scu: integer("scu"),
    /** Min crew (pilot only). */
    crewMin: integer("crew_min"),
    /** Max crew (full station turret manning). */
    crewMax: integer("crew_max"),

    /** Quantum drive range in gigametres. */
    quantumRangeGm: real("quantum_range_gm"),
    /** Quantum fuel capacity in micro-SCU. */
    quantumFuelUscu: integer("quantum_fuel_uscu"),
    /** Hydrogen tank capacity in litres. */
    hydrogenL: integer("hydrogen_l"),
    /** Free-form vehicle bay description ("1× Ursa", "2× ROC"). */
    vehicleBay: text("vehicle_bay"),

    /** Total shield HP across all faces (sum, not face-by-face). */
    shieldHpTotal: integer("shield_hp_total"),
    /** Main hull HP (single number; the per-region tree lives later in a separate column). */
    hullHpMain: integer("hull_hp_main"),

    /** UEX `is_*` flag bag, kept as JSON to avoid 35 columns. */
    flagsJson: text("flags_json", { mode: "json" }).$type<VehicleFlagsJson>(),
    /** Parsed UEX `container_sizes` CSV. */
    containerSizesJson: text("container_sizes_json", {
      mode: "json",
    }).$type<VehicleContainerSizesJson>(),

    /** Canonical image hosted locally after refresh-images downloads it once. */
    urlPhoto: text("url_photo"),
    /** RSI store URL. */
    urlStore: text("url_store"),
    urlBrochure: text("url_brochure"),
    urlHotsite: text("url_hotsite"),
    urlVideo: text("url_video"),
    /** Catch-all extras URLs from UEX. */
    imagesExtrasJson: text("images_extras_json", {
      mode: "json",
    }).$type<VehicleImageExtrasJson>(),

    /** UEX game version this row was last refreshed against (e.g. "LIVE-4.7.0-11518367"). */
    gameVersion: text("game_version"),
    /** UEX `date_added` (unix seconds — kept as int, not converted). */
    dateAdded: integer("date_added"),
    /** UEX `date_modified`. */
    dateModified: integer("date_modified"),

    /** Cheap denorm flags so the catalog filter doesn't need a JSON extract. */
    isConcept: integer("is_concept", { mode: "boolean" }).notNull().default(false),
    isGroundVehicle: integer("is_ground_vehicle", { mode: "boolean" }).notNull().default(false),

    /** First time this row was inserted from any source. */
    ingestedAt: integer("ingested_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    /** Most recent upsert across any source. */
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    slugUnique: uniqueIndex("uniq_vehicles_slug").on(table.slug),
    uuidIdx: index("idx_vehicles_uuid").on(table.uuid),
    manufacturerIdx: index("idx_vehicles_manufacturer").on(table.manufacturerId),
    isConceptIdx: index("idx_vehicles_is_concept").on(table.isConcept),
    isGroundIdx: index("idx_vehicles_is_ground").on(table.isGroundVehicle),
  }),
);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
