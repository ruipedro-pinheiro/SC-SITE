/**
 * Cross-entity search service — searches across vehicles, items, shops,
 * commodities, and locations by name. Returns mixed results tagged with
 * their entity type.
 */

import {
  commodities as commoditiesTable,
  db,
  items as itemsTable,
  locations as locationsTable,
  shops as shopsTable,
  vehicles as vehiclesTable,
} from "@sc-site/db";
import { like, sql } from "drizzle-orm";

export interface SearchResult {
  type: "vehicle" | "item" | "shop" | "commodity" | "location";
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
}

export async function searchAll(query: string, limit: number): Promise<SearchResult[]> {
  const pattern = `%${query}%`;
  const perEntity = Math.max(1, Math.ceil(limit / 5));

  const [vehicleRows, itemRows, shopRows, commodityRows, locationRows] = await Promise.all([
    db
      .select({
        id: sql<string>`cast(${vehiclesTable.id} as text)`,
        name: vehiclesTable.name,
        slug: vehiclesTable.slug,
        subtitle: vehiclesTable.role,
      })
      .from(vehiclesTable)
      .where(like(vehiclesTable.name, pattern))
      .limit(perEntity),
    db
      .select({
        id: itemsTable.id,
        name: itemsTable.name,
        slug: itemsTable.slug,
        subtitle: itemsTable.category,
      })
      .from(itemsTable)
      .where(like(itemsTable.name, pattern))
      .limit(perEntity),
    db
      .select({
        id: sql<string>`cast(${shopsTable.id} as text)`,
        name: shopsTable.name,
        slug: shopsTable.slug,
      })
      .from(shopsTable)
      .where(like(shopsTable.name, pattern))
      .limit(perEntity),
    db
      .select({
        id: sql<string>`cast(${commoditiesTable.id} as text)`,
        name: commoditiesTable.name,
        slug: commoditiesTable.slug,
        subtitle: commoditiesTable.kind,
      })
      .from(commoditiesTable)
      .where(like(commoditiesTable.name, pattern))
      .limit(perEntity),
    db
      .select({
        id: locationsTable.reference,
        name: locationsTable.name,
        navIcon: locationsTable.navIcon,
      })
      .from(locationsTable)
      .where(like(locationsTable.name, pattern))
      .limit(perEntity),
  ]);

  const results: SearchResult[] = [];

  for (const r of vehicleRows) {
    results.push({
      type: "vehicle",
      id: r.id,
      name: r.name,
      slug: r.slug,
      ...(r.subtitle ? { subtitle: r.subtitle } : {}),
    });
  }
  for (const r of itemRows) {
    results.push({
      type: "item",
      id: r.id,
      name: r.name,
      slug: r.slug,
      ...(r.subtitle ? { subtitle: r.subtitle } : {}),
    });
  }
  for (const r of shopRows) {
    results.push({
      type: "shop",
      id: r.id,
      name: r.name,
      slug: r.slug,
    });
  }
  for (const r of commodityRows) {
    results.push({
      type: "commodity",
      id: r.id,
      name: r.name,
      slug: r.slug,
      ...(r.subtitle ? { subtitle: r.subtitle } : {}),
    });
  }
  for (const r of locationRows) {
    results.push({
      type: "location",
      id: r.id,
      name: r.name,
      slug: r.id,
      ...(r.navIcon ? { subtitle: r.navIcon } : {}),
    });
  }

  return results.slice(0, limit);
}
