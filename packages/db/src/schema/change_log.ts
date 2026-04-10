import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Field-level audit trail. Per INGESTION.md §1.a, ONE row per value that
 * actually moved during a refresh. Powers the "patch notes for this ship"
 * timeline on /ships/:slug — answers "what changed in 4.7.0?".
 *
 * Complementary to refresh_log (run-level): join on `ts ± window` to attribute
 * a value change to a specific refresh job run.
 *
 * Retention: keep forever. Estimated growth ~50 MB/year for the first year
 * (vehicles + items combined). Shops/prices are deliberately routed through
 * `price_snapshot` instead — they would blow this table by 100x.
 */

export type ChangeLogEntityType =
  | "vehicle"
  | "item"
  | "shop"
  | "commodity"
  | "location"
  | "blueprint"
  | "manufacturer";

export const changeLog = sqliteTable(
  "change_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Unix milliseconds. */
    ts: integer("ts").notNull(),
    /** Entity table this row references. */
    entityType: text("entity_type").$type<ChangeLogEntityType>().notNull(),
    /** Canonical slug or uuid of the changed entity. */
    entityUuid: text("entity_uuid").notNull(),
    /** Dotted path into the canonical shape, e.g. 'combat.shield_hp'. */
    field: text("field").notNull(),
    /** JSON-stringified previous value. NULL on first write. */
    oldValue: text("old_value"),
    /** JSON-stringified new value. NULL when a field was cleared. */
    newValue: text("new_value"),
    /** Source identifier ('uex' | 'wiki' | 'erkul' | 'cstone' | 'sc-craft' | …). */
    source: text("source").notNull(),
  },
  (table) => ({
    entityIdx: index("idx_change_log_entity").on(table.entityType, table.entityUuid),
    tsIdx: index("idx_change_log_ts").on(table.ts),
    sourceIdx: index("idx_change_log_source").on(table.source),
  }),
);

export type ChangeLogRow = typeof changeLog.$inferSelect;
export type NewChangeLogRow = typeof changeLog.$inferInsert;
