/**
 * Vehicle loader — the ONLY file in `sc-data` that actually writes to the
 * database.
 *
 * Responsibilities:
 *  - Upsert the manufacturer (if present) so the `vehicles.manufacturer_id`
 *    foreign key resolves.
 *  - Diff the incoming vehicle against the current row (if any) and emit
 *    `change_log` entries for every moved field.
 *  - Upsert the vehicle.
 *  - Replace hardpoints (delete-then-insert on `vehicle_id`) — simpler
 *    than per-row diffing in v1 and hardpoints are rarely changed.
 *  - Replace damage_resistance the same way.
 *  - Wrap everything in a single SQLite transaction so a crash leaves no
 *    orphan rows.
 *
 * Note: `drizzle-orm/bun-sqlite` transactions are SYNCHRONOUS. All the DB
 * calls below run through the synchronous `tx.*.run()` API.
 */

import {
  type DB,
  type NewChangeLogRow,
  type NewDamageResistanceRow,
  type NewHardpoint,
  type NewManufacturer,
  type NewVehicle,
  type Vehicle,
  changeLog,
  damageResistance,
  db as defaultDb,
  hardpoints,
  manufacturers,
  vehicles,
} from "@sc-site/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { diffRecord } from "../transform/diff";

export type UpsertVehicleOutcome = "inserted" | "updated" | "unchanged";

export interface UpsertVehicleResult {
  outcome: UpsertVehicleOutcome;
  vehicleId: number;
  changesEmitted: number;
}

export interface UpsertVehicleInput {
  vehicle: NewVehicle;
  manufacturer: NewManufacturer | null;
  hardpoints: NewHardpoint[];
  damageResistance: NewDamageResistanceRow[];
}

export interface UpsertVehicleOptions {
  /** Source identifier written into change_log.source. Default "uex". */
  source?: string;
  /** Drizzle handle (injectable for tests). */
  db?: DB;
  /** Unix ms for change_log timestamps. Default `Date.now()`. */
  now?: () => number;
}

/**
 * Execute the full upsert in a single synchronous transaction.
 *
 * Returns a summary so the orchestrator can tally insert / update /
 * unchanged counts without re-querying.
 */
export function upsertVehicle(
  input: UpsertVehicleInput,
  options: UpsertVehicleOptions = {},
): UpsertVehicleResult {
  const database = options.db ?? defaultDb;
  const source = options.source ?? "uex";
  const nowFn = options.now ?? (() => Date.now());
  const ts = nowFn();

  return database.transaction((tx): UpsertVehicleResult => {
    // 1. Manufacturer upsert. No diffing for now — manufacturers are small
    //    and low-value for change_log. If we ever want them audited we can
    //    thread `diffRecord` through here too.
    if (input.manufacturer !== null) {
      tx.insert(manufacturers)
        .values({ ...input.manufacturer, updatedAt: new Date(ts) })
        .onConflictDoUpdate({
          target: manufacturers.id,
          set: {
            slug: input.manufacturer.slug,
            name: input.manufacturer.name,
            nameCode: input.manufacturer.nameCode ?? null,
            country: input.manufacturer.country ?? null,
            foundedYear: input.manufacturer.foundedYear ?? null,
            logoUrl: input.manufacturer.logoUrl ?? null,
            wikiUrl: input.manufacturer.wikiUrl ?? null,
            storeUrl: input.manufacturer.storeUrl ?? null,
            updatedAt: new Date(ts),
          },
        })
        .run();
    }

    // 2. Read the existing vehicle so the diff engine can see what moved.
    const existing: Vehicle | undefined = tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, input.vehicle.id as number))
      .get();

    // The diff engine needs a Record<string, unknown> and the canonical
    // select shape includes timestamps we want to suppress. The default
    // ignore list already covers `ingestedAt` / `updatedAt`.
    const existingRecord = (existing ?? null) as unknown as Record<string, unknown> | null;
    const incomingRecord = input.vehicle as unknown as Record<string, unknown>;

    const diff = diffRecord(existingRecord, incomingRecord, {
      source,
      ts,
      entityType: "vehicle",
      entityUuid: input.vehicle.slug,
    });

    // 3. Upsert the vehicle. We build the update set explicitly so we
    //    don't overwrite `ingestedAt` on conflict.
    tx.insert(vehicles)
      .values({ ...input.vehicle, updatedAt: new Date(ts) })
      .onConflictDoUpdate({
        target: vehicles.id,
        set: {
          uuid: input.vehicle.uuid ?? null,
          slug: input.vehicle.slug,
          name: input.vehicle.name,
          nameFull: input.vehicle.nameFull ?? null,
          manufacturerId: input.vehicle.manufacturerId ?? null,
          manufacturerName: input.vehicle.manufacturerName ?? null,
          role: input.vehicle.role ?? null,
          size: input.vehicle.size ?? null,
          length: input.vehicle.length ?? null,
          beam: input.vehicle.beam ?? null,
          height: input.vehicle.height ?? null,
          massEmptyKg: input.vehicle.massEmptyKg ?? null,
          scu: input.vehicle.scu ?? null,
          crewMin: input.vehicle.crewMin ?? null,
          crewMax: input.vehicle.crewMax ?? null,
          quantumRangeGm: input.vehicle.quantumRangeGm ?? null,
          quantumFuelUscu: input.vehicle.quantumFuelUscu ?? null,
          hydrogenL: input.vehicle.hydrogenL ?? null,
          vehicleBay: input.vehicle.vehicleBay ?? null,
          shieldHpTotal: input.vehicle.shieldHpTotal ?? null,
          hullHpMain: input.vehicle.hullHpMain ?? null,
          flagsJson: input.vehicle.flagsJson ?? null,
          containerSizesJson: input.vehicle.containerSizesJson ?? null,
          urlPhoto: input.vehicle.urlPhoto ?? null,
          urlStore: input.vehicle.urlStore ?? null,
          urlBrochure: input.vehicle.urlBrochure ?? null,
          urlHotsite: input.vehicle.urlHotsite ?? null,
          urlVideo: input.vehicle.urlVideo ?? null,
          imagesExtrasJson: input.vehicle.imagesExtrasJson ?? null,
          gameVersion: input.vehicle.gameVersion ?? null,
          dateAdded: input.vehicle.dateAdded ?? null,
          dateModified: input.vehicle.dateModified ?? null,
          isConcept: input.vehicle.isConcept ?? false,
          isGroundVehicle: input.vehicle.isGroundVehicle ?? false,
          updatedAt: new Date(ts),
        },
      })
      .run();

    // 4. Hardpoints — delete-then-insert. Empty arrays are fine: we simply
    //    clear any existing rows, which is the correct behaviour when a
    //    source no longer reports them.
    tx.delete(hardpoints)
      .where(eq(hardpoints.vehicleId, input.vehicle.id as number))
      .run();
    for (const hp of input.hardpoints) {
      tx.insert(hardpoints)
        .values({ ...hp, updatedAt: new Date(ts) })
        .run();
    }

    // 5. Damage resistance — same pattern.
    tx.delete(damageResistance)
      .where(eq(damageResistance.vehicleId, input.vehicle.id as number))
      .run();
    for (const dr of input.damageResistance) {
      tx.insert(damageResistance)
        .values({ ...dr, updatedAt: new Date(ts) })
        .run();
    }

    // 6. Persist the change log rows from step 2.
    for (const row of diff.changes as NewChangeLogRow[]) {
      tx.insert(changeLog).values(row).run();
    }

    const outcome: UpsertVehicleOutcome =
      existing === undefined ? "inserted" : diff.changes.length > 0 ? "updated" : "unchanged";

    logger.debug("upsertVehicle done", {
      vehicleId: input.vehicle.id,
      slug: input.vehicle.slug,
      outcome,
      changes: diff.changes.length,
    });

    return {
      outcome,
      vehicleId: input.vehicle.id as number,
      changesEmitted: diff.changes.length,
    };
  });
}

/**
 * Small helper used by the orchestrator: look up an existing vehicle row
 * without loading the whole table. Exposed so tests can assert state.
 */
export function findVehicleById(id: number, database: DB = defaultDb): Vehicle | null {
  const row = database
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, id)))
    .get();
  return row ?? null;
}
