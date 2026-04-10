#!/usr/bin/env bun
/**
 * Enrich vehicles with scunpacked v2/ships.json (the authoritative source
 * extracted from the game client) and cstone shop prices (in-game aUEC).
 *
 * This fills every gap UEX leaves: mass, hull HP, fuel, dimensions,
 * SCM/max speed, crew, and in-game purchase price + location.
 *
 * Run after the base UEX import so vehicles already exist in the DB.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sqlite } from "@sc-site/db";

const HOME = process.env.HOME ?? "/home/pedro";
const basePath = resolve(HOME, "sc-data");

// ── 1. Load scunpacked v2/ships.json ───────────────────────────────────────

interface V2Ship {
  ClassName: string;
  Name: string;
  Career?: string;
  Role?: string;
  Size?: number;
  Cargo?: number;
  Crew?: number;
  WeaponCrew?: number;
  OperationsCrew?: number;
  Mass?: number; // grams
  Health?: number;
  Width?: number;
  Height?: number;
  Length?: number;
  IsSpaceship?: boolean;
  Manufacturer?: { Code?: string; Name?: string };
  FlightCharacteristics?: {
    ScmSpeed?: number;
    MaxSpeed?: number;
    Pitch?: number;
    Yaw?: number;
    Roll?: number;
  };
  Propulsion?: {
    FuelCapacity?: number;
  };
  QuantumTravel?: {
    Speed?: number;
    FuelCapacity?: number;
    Range?: number;
  };
  Insurance?: {
    StandardClaimTime?: number;
    ExpeditedClaimTime?: number;
    ExpeditedCost?: number;
  };
  PilotHardpoints?: Array<{ Size?: number }>;
  MannedTurrets?: Array<{ Size?: number; WeaponSizes?: number[] }>;
  RemoteTurrets?: Array<{ Size?: number; WeaponSizes?: number[] }>;
  MissileRacks?: Array<{ Size?: number; Count?: number }>;
  Shield?: Array<{ Size?: number; Name?: string }>;
}

const v2Ships = JSON.parse(
  readFileSync(resolve(basePath, "json-out/v2/ships.json"), "utf8"),
) as V2Ship[];

console.error(`Loaded ${v2Ships.length} ships from v2/ships.json`);

// ── 2. Load cstone shop prices for ships ───────────────────────────────────

interface CstoneItem {
  ItemId: string;
  name: string;
  type: string;
  price: number;
}

const cstoneAll = JSON.parse(readFileSync(resolve(basePath, "cstone_all.json"), "utf8")) as {
  shops: Record<string, CstoneItem[]>;
};

const shipPrices = new Map<string, { price: number; shop: string }>();
for (const [shopName, items] of Object.entries(cstoneAll.shops)) {
  if (shopName.includes("Rental")) continue;
  for (const item of items) {
    if (item.type !== "Vehicle/Vehicle") continue;
    if (item.price < 50000) continue;
    const existing = shipPrices.get(item.name);
    if (!existing || item.price < existing.price) {
      const parts = shopName.split(" - ");
      shipPrices.set(item.name, {
        price: item.price,
        shop: parts.slice(-2).join(" - "),
      });
    }
  }
}

console.error(`Found ${shipPrices.size} ships with in-game prices from cstone`);

// ── 3. Normalize names for fuzzy matching ──────────────────────────────────

function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/@vehicle_name/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Build v2 lookup by normalized name
const v2ByNorm = new Map<string, V2Ship>();
// Dedupe: prefer non-Unmanned variants
for (const ship of v2Ships) {
  if (ship.ClassName.includes("Unmanned")) continue;
  const key = norm(ship.Name);
  if (!v2ByNorm.has(key)) {
    v2ByNorm.set(key, ship);
  }
}
// Add unmanned as fallback
for (const ship of v2Ships) {
  const key = norm(ship.Name);
  if (!v2ByNorm.has(key)) {
    v2ByNorm.set(key, ship);
  }
}

// ── 4. Update DB ───────────────────────────────────────────────────────────

const dbVehicles = sqlite
  .query("SELECT id, name, name_full, flags_json FROM vehicles")
  .all() as Array<{
  id: number;
  name: string;
  name_full: string | null;
  flags_json: string | null;
}>;

const updateStmt = sqlite.prepare(`
  UPDATE vehicles SET
    mass_empty_kg = ?,
    hull_hp_main = ?,
    hydrogen_l = ?,
    quantum_fuel_uscu = ?,
    length = CASE WHEN ? > 0 THEN ? ELSE length END,
    beam = CASE WHEN ? > 0 THEN ? ELSE beam END,
    height = CASE WHEN ? > 0 THEN ? ELSE height END,
    scu = CASE WHEN ? > 0 THEN ? ELSE scu END,
    crew_min = CASE WHEN ? > 0 THEN ? ELSE crew_min END,
    crew_max = CASE WHEN ? > 0 THEN ? ELSE crew_max END,
    shield_hp_total = CASE WHEN ? > 0 THEN ? ELSE shield_hp_total END,
    flags_json = ?,
    updated_at = ?
  WHERE id = ?
`);

let enrichedCount = 0;
let priceCount = 0;
const tsMs = Date.now();

const tx = sqlite.transaction(() => {
  for (const v of dbVehicles) {
    const displayName = v.name_full ?? v.name;
    const v2 = v2ByNorm.get(norm(displayName)) ?? v2ByNorm.get(norm(v.name));

    const flags: Record<string, unknown> = v.flags_json ? JSON.parse(v.flags_json) : {};

    // Enrich from scunpacked
    let massKg = 0;
    let hullHp = 0;
    let hydrogenL = 0;
    let qtFuelUscu = 0;
    let length = 0;
    let beam = 0;
    let height = 0;
    let scu = 0;
    let crewMin = 0;
    let crewMax = 0;
    const shieldHp = 0;

    if (v2) {
      massKg = v2.Mass ? Math.round(v2.Mass / 1000) : 0; // grams → kg
      hullHp = Math.round(v2.Health ?? 0);
      hydrogenL = Math.round(v2.Propulsion?.FuelCapacity ?? 0);
      qtFuelUscu = v2.QuantumTravel?.FuelCapacity
        ? Math.round(v2.QuantumTravel.FuelCapacity * 1000000)
        : 0;
      length = v2.Length ?? 0;
      beam = v2.Width ?? 0;
      height = v2.Height ?? 0;
      scu = Math.round(v2.Cargo ?? 0);
      crewMin = v2.Crew ?? 0;
      crewMax = (v2.Crew ?? 0) + (v2.WeaponCrew ?? 0) + (v2.OperationsCrew ?? 0);

      // Flight data into flags
      const fc = v2.FlightCharacteristics;
      if (fc) {
        flags._scm_speed = fc.ScmSpeed ?? 0;
        flags._max_speed = fc.MaxSpeed ?? 0;
        flags._pitch = fc.Pitch ?? 0;
        flags._yaw = fc.Yaw ?? 0;
        flags._roll = fc.Roll ?? 0;
      }

      // Quantum speed
      if (v2.QuantumTravel?.Speed) {
        flags._qt_speed = v2.QuantumTravel.Speed;
        flags._qt_range_km = v2.QuantumTravel.Range ? Math.round(v2.QuantumTravel.Range / 1000) : 0;
      }

      enrichedCount++;
    }

    // In-game price from cstone
    const priceInfo = shipPrices.get(displayName) ?? shipPrices.get(v.name);
    if (priceInfo) {
      flags._buy_price_auec = priceInfo.price;
      flags._buy_at_shop = priceInfo.shop;
      priceCount++;
    }

    // Always update (even if no v2 match) to write prices
    updateStmt.run(
      massKg > 0 ? massKg : null,
      hullHp > 0 ? hullHp : null,
      hydrogenL > 0 ? hydrogenL : null,
      qtFuelUscu > 0 ? qtFuelUscu : null,
      length,
      length,
      beam,
      beam,
      height,
      height,
      scu,
      scu,
      crewMin,
      crewMin,
      crewMax,
      crewMax,
      shieldHp,
      shieldHp,
      JSON.stringify(flags),
      tsMs,
      v.id,
    );
  }
});

tx();

console.error(
  JSON.stringify(
    {
      totalVehicles: dbVehicles.length,
      enrichedFromScunpacked: enrichedCount,
      enrichedWithPrice: priceCount,
      status: "ok",
    },
    null,
    2,
  ),
);
