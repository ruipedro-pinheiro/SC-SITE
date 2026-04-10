/**
 * Location read service — Drizzle queries for starmap locations (planets,
 * moons, stations, outposts, POIs, etc.). Route handlers call these
 * functions; they never import `@sc-site/db` directly.
 */

import { type Location, db, locations as locationsTable } from "@sc-site/db";
import { and, eq, isNull, or, sql } from "drizzle-orm";

export interface LocationListFilters {
  /** Filter by navIcon (Planet, Moon, Station, Outpost, LandingZone, Star, Default). */
  type?: string;
  /** Filter by parent location UUID. */
  parent?: string;
  /** Return only root locations (parent IS NULL or orphaned). */
  rootOnly?: boolean;
  limit: number;
  offset: number;
}

export interface LocationListResult {
  locations: Location[];
  total: number;
}

export async function listLocations(filters: LocationListFilters): Promise<LocationListResult> {
  const conditions = [];

  // Filter out garbage data: "Unknown", "@LOC_*", "Turret", empty names
  conditions.push(sql`${locationsTable.name} != 'Unknown'`);
  conditions.push(sql`${locationsTable.name} NOT LIKE '@%'`);
  conditions.push(sql`${locationsTable.name} != 'Turret'`);
  conditions.push(sql`${locationsTable.name} != ''`);

  if (filters.type) {
    conditions.push(eq(locationsTable.navIcon, filters.type));
  }
  if (filters.rootOnly) {
    const rootCondition = or(
      isNull(locationsTable.parent),
      sql`${locationsTable.parent} NOT IN (SELECT reference FROM locations)`,
    );
    if (rootCondition) conditions.push(rootCondition);
  } else if (filters.parent) {
    // Direct children first; if none found, try expanding through
    // same-name stars (scunpacked links planets to the star object,
    // not the system container).
    conditions.push(eq(locationsTable.parent, filters.parent));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  let effectiveWhereClause = whereClause;

  const rowsQuery = db.select().from(locationsTable).limit(filters.limit).offset(filters.offset);

  let rows = whereClause ? await rowsQuery.where(whereClause) : await rowsQuery;

  // Fallback: if a parent filter returned 0 results, the parent might be
  // a "System" container whose children are actually parented under the
  // matching star. Look up the parent's name, find a star with that name,
  // and use its reference instead.
  if (rows.length === 0 && filters.parent && !filters.rootOnly) {
    const parentRow = await getLocationById(filters.parent);
    if (parentRow) {
      const starName = parentRow.name.replace(" System", "");
      const [star] = await db
        .select()
        .from(locationsTable)
        .where(
          and(
            eq(locationsTable.name, starName),
            sql`${locationsTable.reference} != ${filters.parent}`,
          ),
        )
        .limit(1);
      if (star) {
        const fallbackConditions = [
          sql`${locationsTable.name} != 'Unknown'`,
          sql`${locationsTable.name} NOT LIKE '@%'`,
          sql`${locationsTable.name} != 'Turret'`,
          sql`${locationsTable.name} != ''`,
          eq(locationsTable.parent, star.reference),
        ];
        if (filters.type) {
          fallbackConditions.push(eq(locationsTable.navIcon, filters.type));
        }
        effectiveWhereClause = and(...fallbackConditions);
        rows = await db
          .select()
          .from(locationsTable)
          .where(effectiveWhereClause)
          .limit(filters.limit)
          .offset(filters.offset);
      }
    }
  }

  const countRows = await (effectiveWhereClause
    ? db.select({ c: sql<number>`count(*)` }).from(locationsTable).where(effectiveWhereClause)
    : db.select({ c: sql<number>`count(*)` }).from(locationsTable));
  const total = countRows[0]?.c ?? 0;

  return { locations: rows, total };
}

export async function getLocationById(reference: string): Promise<Location | undefined> {
  const [row] = await db
    .select()
    .from(locationsTable)
    .where(eq(locationsTable.reference, reference))
    .limit(1);
  return row;
}
