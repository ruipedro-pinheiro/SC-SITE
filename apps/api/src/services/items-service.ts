/**
 * Item read service — Drizzle queries for items (weapons, shields, coolers,
 * power plants, quantum drives, etc.). Route handlers call these functions;
 * they never import `@sc-site/db` directly.
 */

import { type Item, type ItemCategory, db, items as itemsTable } from "@sc-site/db";
import { and, eq, like, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  Flat stat DTO — extracted from the raw statsJson blob per category */
/* ------------------------------------------------------------------ */

export interface ItemStats {
  /** Weapons: damage per second. */
  dps?: number;
  /** Weapons: total damage per shot (sum of all damage types). */
  damagePerShot?: number;
  /** Weapons: primary damage flavour. */
  damageType?: "ballistic" | "energy" | "distortion";
  /** Weapons: rounds per second. */
  fireRate?: number;
  /** Weapons: projectile speed (m/s). */
  speed?: number;
  /** Weapons / mining: effective range (m). */
  range?: number;

  /** Shields: max hit points. */
  shieldHp?: number;
  /** Shields: regen per second. */
  regenRate?: number;

  /** Quantum drives: cruise speed (m/s). */
  qtSpeed?: number;
  /** Quantum drives: fuel consumption rate. */
  qtFuelRate?: number;
  /** Quantum drives: spool-up time (s). */
  spoolTime?: number;

  /** Power plants: power generation. */
  powerOutput?: number;

  /** Coolers: cooling generation. */
  coolingRate?: number;

  /** Mining lasers: laser instability modifier. */
  miningInstability?: number;
  /** Mining lasers: resistance modifier. */
  miningResistance?: number;
  /** Mining lasers: damage output (energy). */
  miningPower?: number;
}

/** Item with statsJson replaced by flat extracted stats. */
export type ItemDTO = Omit<Item, "statsJson"> & { stats: ItemStats };

/* ------------------------------------------------------------------ */
/*  Stats extraction helpers                                          */
/* ------------------------------------------------------------------ */

/** Safe deep-get for unknown JSON blobs. */
function dig(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractWeaponStats(raw: unknown): ItemStats {
  const dmgPhys = num(dig(raw, "ammo", "data", "damage", "damagePhysical")) ?? 0;
  const dmgEnergy = num(dig(raw, "ammo", "data", "damage", "damageEnergy")) ?? 0;
  const dmgDistortion = num(dig(raw, "ammo", "data", "damage", "damageDistortion")) ?? 0;
  const damagePerShot = dmgPhys + dmgEnergy + dmgDistortion;

  const fireRateMs = num(dig(raw, "weapon", "fireActions", "0", "fireRate"));
  const rps = fireRateMs !== undefined && fireRateMs > 0 ? 1000 / fireRateMs : undefined;

  const speed = num(dig(raw, "ammo", "data", "speed"));
  const lifetime = num(dig(raw, "ammo", "data", "lifetime"));

  let damageType: "ballistic" | "energy" | "distortion" = "energy";
  if (dmgPhys >= dmgEnergy && dmgPhys >= dmgDistortion) damageType = "ballistic";
  else if (dmgDistortion > dmgEnergy) damageType = "distortion";

  return buildStats([
    [
      "dps",
      rps !== undefined && damagePerShot > 0
        ? Math.round(damagePerShot * rps * 100) / 100
        : undefined,
    ],
    ["damagePerShot", damagePerShot > 0 ? Math.round(damagePerShot * 100) / 100 : undefined],
    ["damageType", damagePerShot > 0 ? damageType : undefined],
    ["fireRate", rps !== undefined ? Math.round(rps * 100) / 100 : undefined],
    ["speed", speed],
    [
      "range",
      speed !== undefined && lifetime !== undefined ? Math.round(speed * lifetime) : undefined,
    ],
  ]);
}

/** Build an ItemStats object, omitting keys whose values are undefined. */
function buildStats(entries: [keyof ItemStats, ItemStats[keyof ItemStats]][]): ItemStats {
  const out: ItemStats = {};
  for (const [k, v] of entries) {
    if (v !== undefined) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function extractShieldStats(raw: unknown): ItemStats {
  return buildStats([
    ["shieldHp", num(dig(raw, "shield", "maxShieldHealth"))],
    ["regenRate", num(dig(raw, "shield", "maxShieldRegen"))],
  ]);
}

function extractQDStats(raw: unknown): ItemStats {
  return buildStats([
    ["qtSpeed", num(dig(raw, "qdrive", "params", "driveSpeed"))],
    ["qtFuelRate", num(dig(raw, "qdrive", "quantumFuelRequirement"))],
    ["spoolTime", num(dig(raw, "qdrive", "params", "spoolUpTime"))],
  ]);
}

function extractPowerPlantStats(raw: unknown): ItemStats {
  return buildStats([
    ["powerOutput", num(dig(raw, "resource", "online", "generation", "powerSegment"))],
  ]);
}

function extractCoolerStats(raw: unknown): ItemStats {
  return buildStats([
    ["coolingRate", num(dig(raw, "resource", "online", "generation", "cooling"))],
  ]);
}

function extractMiningStats(raw: unknown): ItemStats {
  return buildStats([
    ["miningInstability", num(dig(raw, "miningLaser", "laserInstability"))],
    ["miningResistance", num(dig(raw, "miningLaser", "resistanceModifier"))],
    ["miningPower", num(dig(raw, "weapon", "mining", "damage", "damageEnergy"))],
    ["range", num(dig(raw, "weapon", "mining", "fullDamageRange"))],
  ]);
}

function extractStats(category: string, raw: unknown): ItemStats {
  if (raw == null) return {};
  switch (category) {
    case "weapon":
    case "fps_weapon":
      return extractWeaponStats(raw);
    case "shield":
      return extractShieldStats(raw);
    case "quantum_drive":
      return extractQDStats(raw);
    case "power_plant":
      return extractPowerPlantStats(raw);
    case "cooler":
      return extractCoolerStats(raw);
    case "mining_laser":
      return extractMiningStats(raw);
    default:
      return {};
  }
}

function toItemDTO(item: Item): ItemDTO {
  const { statsJson, ...rest } = item;
  return { ...rest, stats: extractStats(item.category, statsJson) };
}

/* ------------------------------------------------------------------ */
/*  Query functions                                                    */
/* ------------------------------------------------------------------ */

export interface ItemListFilters {
  category?: string;
  size?: number;
  manufacturer?: string;
  limit: number;
  offset: number;
}

export interface ItemListResult {
  items: ItemDTO[];
  total: number;
}

export async function listItems(filters: ItemListFilters): Promise<ItemListResult> {
  const conditions = [];
  if (filters.category) {
    conditions.push(eq(itemsTable.category, filters.category as ItemCategory));
  }
  if (filters.size !== undefined) {
    conditions.push(eq(itemsTable.size, filters.size));
  }
  if (filters.manufacturer) {
    conditions.push(like(itemsTable.manufacturer, `%${filters.manufacturer}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rowsQuery = db.select().from(itemsTable).limit(filters.limit).offset(filters.offset);

  const rows = whereClause ? await rowsQuery.where(whereClause) : await rowsQuery;

  const countRows = await (whereClause
    ? db.select({ c: sql<number>`count(*)` }).from(itemsTable).where(whereClause)
    : db.select({ c: sql<number>`count(*)` }).from(itemsTable));
  const total = countRows[0]?.c ?? 0;

  return { items: rows.map(toItemDTO), total };
}

export async function getItemById(id: string): Promise<ItemDTO | undefined> {
  const [row] = await db.select().from(itemsTable).where(eq(itemsTable.id, id)).limit(1);
  return row !== undefined ? toItemDTO(row) : undefined;
}
