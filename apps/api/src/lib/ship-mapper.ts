/**
 * DB → UI `Ship` mapper. This is the *only* place the two shapes touch.
 *
 * The frontend type lives at `packages/ui/src/sc/types.ts`. We intentionally
 * do NOT import that type here, to avoid a cross-app import loop (apps/api
 * must not depend on packages/ui) — instead we re-declare a structural copy
 * named `ShipDto` with the same field names and document this contract
 * explicitly. Wave 3 (apps-web-wiring) will verify shape parity at the
 * consumer boundary via the RPC `AppType` export.
 *
 * Rules (no hardcode, no fabrication):
 *   - Missing dimensions/mass/HP → 0 (UI already tolerates zeros).
 *   - Missing damage_resistance rows → null (UI hides the section).
 *   - Missing hardpoints → empty array (UI renders "no hardpoints" state).
 *   - `history` is always `[]` — no patch history data is ingested yet.
 */

import type {
  DamageResistanceRow as DbDamageRow,
  Hardpoint as DbHardpoint,
  Manufacturer as DbManufacturer,
  Vehicle as DbVehicle,
} from "@sc-site/db";
import { resolveManufacturerCode } from "./manufacturer-code";

// -- Shape mirrors packages/ui/src/sc/types.ts ------------------------------

export type ShipSize = "Snub" | "Small" | "Medium" | "Large" | "Capital";

export type HardpointMountKind =
  | "pilot fixed"
  | "pilot gimbal"
  | "manned"
  | "manned turret"
  | "remote turret"
  | "rack";

export type HardpointLocation = "nose" | "dorsal" | "belly" | "chin" | "wing" | "missile" | "side";

export interface HardpointDto {
  id: string;
  size: number;
  location: HardpointLocation;
  type: HardpointMountKind;
  weapon?: string;
}

export interface DamageResistanceRowDto {
  multiplier: number;
  fillPct: number;
  accent?: "sky" | "peach";
}

export interface DamageResistanceDto {
  physical: DamageResistanceRowDto;
  distortion: DamageResistanceRowDto;
  energy: DamageResistanceRowDto;
  thermal: DamageResistanceRowDto;
  biochemical: DamageResistanceRowDto;
}

export interface HistoryEntryDto {
  version: string;
  date: string;
  summary: string;
  category: "combat" | "mobility" | "economy" | "cosmetic";
}

export interface ShipDto {
  slug: string;
  name: string;
  manufacturer: string;
  manufacturerCode: string;
  role: string;
  size: ShipSize;
  isConcept: boolean;
  length: number;
  beam: number;
  height: number;
  massEmpty: number;
  scu: number;
  crewMin: number;
  crewMax: number;
  scmSpeed?: number;
  maxSpeed?: number;
  quantumRangeGm?: number;
  quantumFuelUscu?: number;
  hydrogenL?: number;
  vehicleBay?: string;
  shieldHp: number;
  hullHp: number;
  hardpoints: ReadonlyArray<HardpointDto>;
  damageResistance: DamageResistanceDto | null;
  buyPriceAuec?: number;
  buyAt?: string;
  pledgeStoreUrl?: string;
  pledgeUsd?: number;
  photo?: string;
  history: ReadonlyArray<HistoryEntryDto>;
}

// -- Mapper -----------------------------------------------------------------

/** Aggregate input to the mapper — one joined row group per vehicle. */
export interface ShipMapperInput {
  vehicle: DbVehicle;
  manufacturer: DbManufacturer | null;
  hardpoints: ReadonlyArray<DbHardpoint>;
  damageResistance: ReadonlyArray<DbDamageRow>;
}

const ALLOWED_SIZES: ReadonlySet<ShipSize> = new Set([
  "Snub",
  "Small",
  "Medium",
  "Large",
  "Capital",
]);

const ALLOWED_HP_LOCATIONS: ReadonlySet<HardpointLocation> = new Set([
  "nose",
  "dorsal",
  "belly",
  "chin",
  "wing",
  "missile",
  "side",
]);

const ALLOWED_HP_TYPES: ReadonlySet<HardpointMountKind> = new Set([
  "pilot fixed",
  "pilot gimbal",
  "manned",
  "manned turret",
  "remote turret",
  "rack",
]);

function coerceSize(raw: string | null | undefined): ShipSize {
  if (raw && ALLOWED_SIZES.has(raw as ShipSize)) return raw as ShipSize;
  return "Small";
}

function coerceHpLocation(raw: string | null | undefined): HardpointLocation {
  if (raw && ALLOWED_HP_LOCATIONS.has(raw as HardpointLocation)) {
    return raw as HardpointLocation;
  }
  // DB allows `hull` / `interior` which the UI doesn't model yet — fall back
  // to the closest UI-supported bucket.
  return "side";
}

function coerceHpType(raw: string | null | undefined): HardpointMountKind {
  if (raw && ALLOWED_HP_TYPES.has(raw as HardpointMountKind)) {
    return raw as HardpointMountKind;
  }
  // `utility` (tractor beams etc.) collapses to "rack" which is the most
  // neutral non-pilot bucket in the UI enum.
  return "rack";
}

function neutralResistance(): DamageResistanceRowDto {
  return { multiplier: 1.0, fillPct: 60 };
}

function pickAccent(multiplier: number): "sky" | "peach" | undefined {
  if (multiplier < 0.8) return "sky";
  if (multiplier > 1.2) return "peach";
  return undefined;
}

function mapDamageRow(row: DbDamageRow | undefined): DamageResistanceRowDto {
  if (!row) return neutralResistance();
  const accent = pickAccent(row.multiplier);
  return {
    multiplier: row.multiplier,
    fillPct: row.fillPct ?? 60,
    ...(accent !== undefined ? { accent } : {}),
  };
}

function mapDamageResistance(rows: ReadonlyArray<DbDamageRow>): DamageResistanceDto | null {
  if (rows.length === 0) return null;
  const byType = new Map(rows.map((r) => [r.damageType, r] as const));
  return {
    physical: mapDamageRow(byType.get("physical")),
    distortion: mapDamageRow(byType.get("distortion")),
    energy: mapDamageRow(byType.get("energy")),
    thermal: mapDamageRow(byType.get("thermal")),
    biochemical: mapDamageRow(byType.get("biochemical")),
  };
}

function mapHardpoints(rows: ReadonlyArray<DbHardpoint>): ReadonlyArray<HardpointDto> {
  return rows.map((row) => ({
    id: row.id,
    size: row.size,
    location: coerceHpLocation(row.location),
    type: coerceHpType(row.type),
    ...(row.defaultWeaponName ? { weapon: row.defaultWeaponName } : {}),
  }));
}

/**
 * Convert grams/kilograms to tonnes. UEX / scunpacked both publish empty
 * mass in kilograms, the UI wants metric tonnes.
 */
function kgToTonnes(kg: number | null | undefined): number {
  if (kg === null || kg === undefined) return 0;
  return Math.round(kg / 1000);
}

export function mapVehicleToShip(input: ShipMapperInput): ShipDto {
  const { vehicle, manufacturer, hardpoints, damageResistance } = input;

  const manufacturerName = manufacturer?.name ?? vehicle.manufacturerName ?? "Unknown Manufacturer";
  const manufacturerCode = resolveManufacturerCode({
    nameCode: manufacturer?.nameCode,
    name: manufacturerName,
    slug: manufacturer?.slug,
  });

  const ship: ShipDto = {
    slug: vehicle.slug,
    name: vehicle.nameFull ?? vehicle.name,
    manufacturer: manufacturerName,
    manufacturerCode,
    role: vehicle.role ?? "Unknown",
    size: coerceSize(vehicle.size),
    isConcept: vehicle.isConcept === true,
    length: vehicle.length ?? 0,
    beam: vehicle.beam ?? 0,
    height: vehicle.height ?? 0,
    massEmpty: kgToTonnes(vehicle.massEmptyKg),
    scu: vehicle.scu ?? 0,
    crewMin: vehicle.crewMin ?? 1,
    crewMax: vehicle.crewMax ?? 1,
    shieldHp: vehicle.shieldHpTotal ?? 0,
    hullHp: vehicle.hullHpMain ?? 0,
    hardpoints: mapHardpoints(hardpoints),
    damageResistance: mapDamageResistance(damageResistance),
    history: [],
  };

  // Optional fields — only set when DB has a value, to respect
  // exactOptionalPropertyTypes.
  if (vehicle.quantumRangeGm !== null && vehicle.quantumRangeGm !== undefined) {
    ship.quantumRangeGm = vehicle.quantumRangeGm;
  }
  if (vehicle.quantumFuelUscu !== null && vehicle.quantumFuelUscu !== undefined) {
    ship.quantumFuelUscu = vehicle.quantumFuelUscu;
  }
  if (vehicle.hydrogenL !== null && vehicle.hydrogenL !== undefined) {
    ship.hydrogenL = vehicle.hydrogenL;
  }
  if (vehicle.vehicleBay) {
    ship.vehicleBay = vehicle.vehicleBay;
  }
  if (vehicle.urlStore) {
    ship.pledgeStoreUrl = vehicle.urlStore;
  }
  if (vehicle.urlPhoto) {
    ship.photo = vehicle.urlPhoto;
  }

  // In-game price, shop, and speeds from flags_json
  const flags = vehicle.flagsJson as Record<string, unknown> | null;
  if (flags) {
    const buyPrice = flags._buy_price_auec;
    const buyShop = flags._buy_at_shop;
    if (typeof buyPrice === "number" && buyPrice > 0) {
      ship.buyPriceAuec = buyPrice;
    }
    if (typeof buyShop === "string" && buyShop.length > 0) {
      ship.buyAt = buyShop;
    }
    const scmSpeed = flags._scm_speed;
    const maxSpeed = flags._max_speed;
    if (typeof scmSpeed === "number" && scmSpeed > 0) {
      ship.scmSpeed = scmSpeed;
    }
    if (typeof maxSpeed === "number" && maxSpeed > 0) {
      ship.maxSpeed = maxSpeed;
    }
  }

  return ship;
}
