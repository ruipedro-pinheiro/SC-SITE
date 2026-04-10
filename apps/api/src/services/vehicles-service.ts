/**
 * Vehicle read service — the only module in the API that touches the DB for
 * vehicle reads. Route handlers call these functions; they never import
 * `@sc-site/db` directly. Keeping Drizzle isolated here makes the seam easy
 * to stub, unit test, and (eventually) add caching around.
 */

import {
  type Manufacturer,
  damageResistance as damageResistanceTable,
  db,
  hardpoints as hardpointsTable,
  manufacturers as manufacturersTable,
  vehicles as vehiclesTable,
} from "@sc-site/db";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { manufacturerNamesForCode, resolveManufacturerCode } from "../lib/manufacturer-code";
import { type ShipDto, mapVehicleToShip } from "../lib/ship-mapper";

// -- Types ------------------------------------------------------------------

export interface VehicleListFilters {
  /** Manufacturer `name_code` (e.g. "ANVL"). Exact match. */
  company?: string;
  /** Vehicle size class. Exact match against `vehicles.size`. */
  size?: string;
  /** When true, returns only vehicles flagged exploration. */
  isExploration?: boolean;
  /** Filter by concept status. true = concept only, false = flyable only. */
  isConcept?: boolean;
  /** When true, returns only vehicles with a buy price > 0. */
  buyable?: boolean;
  /** Sort order. Default is name ascending. */
  sort?: "name" | "price-asc" | "price-desc";
  /** Pagination. Defaults applied at the route layer. */
  limit: number;
  offset: number;
}

export interface VehicleListResult {
  ships: ShipDto[];
  total: number;
  latestUpdatedAt: string | null;
}

// -- List -------------------------------------------------------------------

/**
 * Return a page of ships matching the given filters, plus the unfiltered
 * total count so the client can render paginator state.
 */
export async function listVehicles(filters: VehicleListFilters): Promise<VehicleListResult> {
  const conditions = [];
  if (filters.company) {
    const rawCompany = filters.company.trim();
    const normalizedCompany = rawCompany.toUpperCase();
    const namesMatchingCode = manufacturerNamesForCode(normalizedCompany);
    const companyCondition = or(
      eq(manufacturersTable.nameCode, normalizedCompany),
      eq(manufacturersTable.slug, rawCompany.toLowerCase()),
      eq(manufacturersTable.name, rawCompany),
      ...namesMatchingCode.map((name) => eq(manufacturersTable.name, name)),
    );
    if (companyCondition) conditions.push(companyCondition);
  }
  if (filters.size) {
    conditions.push(
      eq(vehiclesTable.size, filters.size as "Snub" | "Small" | "Medium" | "Large" | "Capital"),
    );
  }
  if (filters.isExploration === true) {
    // Uses the JSON-extracted flag; falls back to 0 for null.
    conditions.push(sql`json_extract(${vehiclesTable.flagsJson}, '$.is_exploration') = 1`);
  }
  if (filters.isConcept !== undefined) {
    conditions.push(eq(vehiclesTable.isConcept, filters.isConcept));
  }
  if (filters.buyable === true) {
    conditions.push(sql`json_extract(${vehiclesTable.flagsJson}, '$._buy_price_auec') > 0`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort order
  const orderByClause =
    filters.sort === "price-asc"
      ? asc(sql`COALESCE(json_extract(${vehiclesTable.flagsJson}, '$._buy_price_auec'), 999999999)`)
      : filters.sort === "price-desc"
        ? desc(sql`COALESCE(json_extract(${vehiclesTable.flagsJson}, '$._buy_price_auec'), 0)`)
        : asc(vehiclesTable.name);

  // 1. Page of vehicles (with manufacturer joined).
  const rowsQuery = db
    .select({
      vehicle: vehiclesTable,
      manufacturer: manufacturersTable,
    })
    .from(vehiclesTable)
    .leftJoin(manufacturersTable, eq(vehiclesTable.manufacturerId, manufacturersTable.id))
    .orderBy(orderByClause)
    .limit(filters.limit)
    .offset(filters.offset);

  const rows = whereClause ? await rowsQuery.where(whereClause) : await rowsQuery;

  // 2. Total row count honouring the same filter set.
  const countRows = await (whereClause
    ? db
        .select({ c: sql<number>`count(*)` })
        .from(vehiclesTable)
        .leftJoin(manufacturersTable, eq(vehiclesTable.manufacturerId, manufacturersTable.id))
        .where(whereClause)
    : db.select({ c: sql<number>`count(*)` }).from(vehiclesTable));
  const total = countRows[0]?.c ?? 0;

  if (rows.length === 0) {
    return { ships: [], total, latestUpdatedAt: null };
  }

  const vehicleIds = rows.map((r) => r.vehicle.id);

  // 3. Bulk-fetch hardpoints + damage-resistance for just this page.
  const hps =
    vehicleIds.length > 0
      ? await db
          .select()
          .from(hardpointsTable)
          .where(sql`${hardpointsTable.vehicleId} IN ${vehicleIds}`)
      : [];
  const drs =
    vehicleIds.length > 0
      ? await db
          .select()
          .from(damageResistanceTable)
          .where(sql`${damageResistanceTable.vehicleId} IN ${vehicleIds}`)
      : [];

  const hpByVehicle = new Map<number, typeof hps>();
  for (const hp of hps) {
    const list = hpByVehicle.get(hp.vehicleId) ?? [];
    list.push(hp);
    hpByVehicle.set(hp.vehicleId, list);
  }
  const drByVehicle = new Map<number, typeof drs>();
  for (const dr of drs) {
    const list = drByVehicle.get(dr.vehicleId) ?? [];
    list.push(dr);
    drByVehicle.set(dr.vehicleId, list);
  }

  // 4. Map to ShipDto and compute max(updated_at) for the envelope.
  let latestMs = 0;
  const ships = rows.map(({ vehicle, manufacturer }) => {
    const updatedMs = vehicle.updatedAt instanceof Date ? vehicle.updatedAt.getTime() : 0;
    if (updatedMs > latestMs) latestMs = updatedMs;
    return mapVehicleToShip({
      vehicle,
      manufacturer: manufacturer ?? null,
      hardpoints: hpByVehicle.get(vehicle.id) ?? [],
      damageResistance: drByVehicle.get(vehicle.id) ?? [],
    });
  });

  return {
    ships,
    total,
    latestUpdatedAt: latestMs > 0 ? new Date(latestMs).toISOString() : null,
  };
}

// -- Single by slug ---------------------------------------------------------

export async function getVehicleBySlug(slug: string): Promise<ShipDto | null> {
  const rows = await db
    .select({
      vehicle: vehiclesTable,
      manufacturer: manufacturersTable,
    })
    .from(vehiclesTable)
    .leftJoin(manufacturersTable, eq(vehiclesTable.manufacturerId, manufacturersTable.id))
    .where(eq(vehiclesTable.slug, slug))
    .limit(1);

  const head = rows[0];
  if (!head) return null;

  const hps = await db
    .select()
    .from(hardpointsTable)
    .where(eq(hardpointsTable.vehicleId, head.vehicle.id));

  const drs = await db
    .select()
    .from(damageResistanceTable)
    .where(eq(damageResistanceTable.vehicleId, head.vehicle.id));

  return mapVehicleToShip({
    vehicle: head.vehicle,
    manufacturer: head.manufacturer ?? null,
    hardpoints: hps,
    damageResistance: drs,
  });
}

// -- Hardpoints only --------------------------------------------------------

export async function getHardpointsBySlug(slug: string): Promise<{
  found: boolean;
  hardpoints: ReadonlyArray<{
    id: string;
    size: number;
    location: string;
    type: string;
    weapon?: string;
  }>;
}> {
  const [vehicle] = await db
    .select({ id: vehiclesTable.id })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.slug, slug))
    .limit(1);

  if (!vehicle) return { found: false, hardpoints: [] };

  const hps = await db
    .select()
    .from(hardpointsTable)
    .where(eq(hardpointsTable.vehicleId, vehicle.id));

  return {
    found: true,
    hardpoints: hps.map((hp) => ({
      id: hp.id,
      size: hp.size,
      location: hp.location,
      type: hp.type,
      ...(hp.defaultWeaponName ? { weapon: hp.defaultWeaponName } : {}),
    })),
  };
}

// -- Manufacturers ----------------------------------------------------------

export async function listManufacturers(): Promise<Manufacturer[]> {
  const rows = await db.select().from(manufacturersTable);
  return rows.map((row) => ({
    ...row,
    nameCode: resolveManufacturerCode(row),
  }));
}
