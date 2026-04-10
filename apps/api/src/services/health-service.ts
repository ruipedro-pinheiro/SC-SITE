/**
 * Health probe — counts rows in the major tables so we can tell at a glance
 * whether ingestion has populated anything. Wraps every query in try/catch
 * because a missing/corrupt DB file is one of the failure modes we want to
 * surface as `status: "down"` instead of crashing the process.
 */

import {
  db,
  hardpoints as hardpointsTable,
  manufacturers as manufacturersTable,
  vehicles as vehiclesTable,
} from "@sc-site/db";
import { sql } from "drizzle-orm";

export interface DbHealth {
  status: "ok" | "down";
  vehicles: number;
  manufacturers: number;
  hardpoints: number;
  error?: string;
}

export async function getDbHealth(): Promise<DbHealth> {
  try {
    const vRow = await db.select({ c: sql<number>`count(*)` }).from(vehiclesTable);
    const mRow = await db.select({ c: sql<number>`count(*)` }).from(manufacturersTable);
    const hRow = await db.select({ c: sql<number>`count(*)` }).from(hardpointsTable);
    return {
      status: "ok",
      vehicles: vRow[0]?.c ?? 0,
      manufacturers: mRow[0]?.c ?? 0,
      hardpoints: hRow[0]?.c ?? 0,
    };
  } catch (err) {
    return {
      status: "down",
      vehicles: 0,
      manufacturers: 0,
      hardpoints: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
