#!/usr/bin/env bun
/**
 * Import erkul_all.json into the items table + enrich vehicles with hardpoints.
 *
 * Usage:
 *   bun run packages/sc-data/scripts/import-erkul.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, hardpoints, items, sqlite, vehicles } from "@sc-site/db";
import { eq } from "drizzle-orm";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Map erkul top-level array keys to our normalized category names. */
const CATEGORY_MAP: Record<string, string> = {
  weapons: "weapon",
  shields: "shield",
  coolers: "cooler",
  power_plants: "power_plant",
  qdrives: "quantum_drive",
  missiles: "missile",
  mining_lasers: "mining_laser",
  modules: "module",
  utilities: "utility",
};

/** Fields to exclude from stats JSON (they're stored as top-level columns). */
const EXCLUDE_FROM_STATS = new Set([
  "name",
  "shortName",
  "description",
  "size",
  "grade",
  "type",
  "subType",
  "ref",
  "manufacturerData",
]);

interface ErkulItem {
  calculatorType: string;
  localName: string;
  data: Record<string, unknown>;
}

interface ErkulData {
  info: Record<string, unknown>;
  ships: ErkulItem[];
  [key: string]: unknown;
}

function main(): void {
  const dataPath = resolve(process.env.HOME ?? "/home/pedro", "sc-data/erkul_all.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf8")) as ErkulData;

  let itemCount = 0;
  let shipCount = 0;
  const ts = new Date();

  const runAll = sqlite.transaction(() => {
    // 1. Import non-ship items
    for (const [arrayKey, category] of Object.entries(CATEGORY_MAP)) {
      const arr = raw[arrayKey] as ErkulItem[] | undefined;
      if (!arr) continue;

      for (const entry of arr) {
        const data = entry.data;
        const ref = data.ref as string | undefined;
        if (!ref) continue;

        const name = (data.name as string) ?? entry.localName;
        const mfr = (data.manufacturerData as { data?: { name?: string } } | undefined)?.data?.name;

        // Build stats JSON from all non-excluded fields
        const stats: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (!EXCLUDE_FROM_STATS.has(k)) {
            stats[k] = v;
          }
        }

        db.insert(items)
          .values({
            id: ref,
            slug: slugify(name),
            name,
            category: category as import("@sc-site/db").ItemCategory,
            manufacturer: mfr ?? null,
            size: typeof data.size === "number" ? data.size : null,
            grade: (data.grade as string) ?? null,
            type: (data.type as string) ?? null,
            description: (data.description as string) ?? null,
            statsJson: stats,
            source: "erkul",
            updatedAt: ts,
          })
          .onConflictDoUpdate({
            target: items.id,
            set: {
              name,
              category: category as import("@sc-site/db").ItemCategory,
              manufacturer: mfr ?? null,
              size: typeof data.size === "number" ? data.size : null,
              grade: (data.grade as string) ?? null,
              type: (data.type as string) ?? null,
              description: (data.description as string) ?? null,
              statsJson: stats,
              source: "erkul",
              updatedAt: ts,
            },
          })
          .run();
        itemCount++;
      }
    }

    // 2. Enrich vehicles with hardpoint data from ships
    for (const ship of raw.ships) {
      const data = ship.data;
      const ref = data.ref as string | undefined;
      if (!ref) continue;

      // Find the vehicle by UUID
      const vehicle = db.select().from(vehicles).where(eq(vehicles.uuid, ref)).get();
      if (!vehicle) continue;

      const loadout = data.loadout as
        | Array<{
            itemPortName?: string;
            localName?: string;
            maxSize?: number;
            minSize?: number;
            itemTypes?: Array<{ type?: string; subType?: string }>;
            children?: unknown[];
          }>
        | undefined;
      if (!loadout) continue;

      // Delete existing erkul-sourced hardpoints for this vehicle
      // Only delete hardpoints from erkul source; leave UEX-sourced ones
      db.delete(hardpoints).where(eq(hardpoints.vehicleId, vehicle.id)).run();

      let hpIndex = 0;
      for (const port of loadout) {
        const types = port.itemTypes ?? [];
        const isWeapon = types.some(
          (t) =>
            t.type === "WeaponGun" ||
            t.type === "MissileLauncher" ||
            t.type === "Turret" ||
            t.type === "TurretBase",
        );
        if (!isWeapon) continue;

        const portName = port.itemPortName ?? "";
        const location = inferLocation(portName);
        const hpType = inferHpType(types);

        db.insert(hardpoints)
          .values({
            id: `${vehicle.slug}_erkul_${hpIndex}`,
            vehicleId: vehicle.id,
            location,
            type: hpType,
            size: port.maxSize ?? 1,
            mountCount: 1,
            defaultWeaponName: (port.localName as string) ?? null,
            source: "erkul",
            updatedAt: ts,
          })
          .run();
        hpIndex++;
      }
      shipCount++;
    }
  }); // end transaction

  runAll();

  console.error(
    JSON.stringify({ items: itemCount, shipsEnriched: shipCount, status: "ok" }, null, 2),
  );
}

function inferLocation(portName: string): import("@sc-site/db").HardpointLocation {
  const p = portName.toLowerCase();
  if (p.includes("nose") || p.includes("chin")) return "nose";
  if (p.includes("dorsal") || p.includes("top")) return "dorsal";
  if (p.includes("belly") || p.includes("bottom") || p.includes("ventral")) return "belly";
  if (p.includes("wing")) return "wing";
  if (p.includes("missile") || p.includes("pylon") || p.includes("rack")) return "missile";
  if (p.includes("side") || p.includes("left") || p.includes("right")) return "side";
  if (p.includes("interior")) return "interior";
  return "hull";
}

function inferHpType(
  types: Array<{ type?: string; subType?: string }>,
): import("@sc-site/db").HardpointType {
  for (const t of types) {
    if (t.type === "MissileLauncher") return "rack";
    if (t.type === "Turret" && t.subType === "GunTurret") return "remote turret";
    if (t.type === "Turret") return "pilot gimbal";
  }
  return "pilot fixed";
}

main();
