/**
 * Shared ship type used by every panel in `packages/ui/src/sc/*`.
 *
 * The fixture set in `apps/web/lib/mock-data.ts` provides four real SC ships
 * (Carrack, Corsair, Aurora MR, Cutlass Black) wired through this shape.
 * The ingestion API will eventually return rows that satisfy this same shape
 * so swapping in real data later is a one-line change in the page loader.
 */

export type ShipSize = "Snub" | "Small" | "Medium" | "Large" | "Capital";

export type HardpointMountKind =
  | "pilot fixed"
  | "pilot gimbal"
  | "manned"
  | "manned turret"
  | "remote turret"
  | "rack";

export interface Hardpoint {
  /** Stable identifier for the mount, e.g. "nose-l", "dorsal-1". */
  id: string;
  /** Weapon size class, S1 – S10. */
  size: number;
  /** Where the mount lives on the hull. */
  location: "nose" | "dorsal" | "belly" | "chin" | "wing" | "missile" | "side";
  type: HardpointMountKind;
  /** Currently mounted weapon (or rack contents). Free-form display string. */
  weapon?: string;
}

export interface DamageResistanceRow {
  /** Aggregated multiplier — higher = more resistant. */
  multiplier: number;
  /** Pre-computed bar width 0 – 100. */
  fillPct: number;
  /** Optional accent for the strongest / weakest two rows. */
  accent?: "sky" | "peach";
}

export interface DamageResistance {
  physical: DamageResistanceRow;
  distortion: DamageResistanceRow;
  energy: DamageResistanceRow;
  thermal: DamageResistanceRow;
  biochemical: DamageResistanceRow;
}

export interface HistoryEntry {
  /** Patch version, e.g. "4.7.0-LIVE.11576750". */
  version: string;
  /** ISO date of the patch. */
  date: string;
  /** Short summary, three highest-magnitude changes joined by ` · `. */
  summary: string;
  category: "combat" | "mobility" | "economy" | "cosmetic";
}

export interface Ship {
  slug: string;
  name: string;
  manufacturer: string;
  manufacturerCode: string;
  role: string;
  size: ShipSize;
  isConcept: boolean;
  // dimensions in metres
  length: number;
  beam: number;
  height: number;
  // mass in tonnes (empty)
  massEmpty: number;
  // logistics
  scu: number;
  crewMin: number;
  crewMax: number;
  scmSpeed?: number;
  maxSpeed?: number;
  quantumRangeGm?: number;
  quantumFuelUscu?: number;
  hydrogenL?: number;
  vehicleBay?: string;
  // combat
  shieldHp: number;
  hullHp: number;
  hardpoints: ReadonlyArray<Hardpoint>;
  damageResistance: DamageResistance | null;
  // economy
  buyPriceAuec?: number;
  buyAt?: string;
  pledgeStoreUrl?: string;
  pledgeUsd?: number;
  // media
  photo?: string;
  // history
  history: ReadonlyArray<HistoryEntry>;
}

/* -------------------------------------------------------------------
   Item — ship components (weapons, shields, coolers, QDs, power plants,
   mining heads) and FPS weapons. The API returns these from the items
   table; each page filters by `type`.
   ------------------------------------------------------------------- */

export type ItemType =
  | "WeaponGun"
  | "MissileLauncher"
  | "Shield"
  | "Cooler"
  | "QuantumDrive"
  | "PowerPlant"
  | "WeaponMining"
  | "WeaponPersonal"
  | "WeaponDefensive";

export interface Item {
  slug: string;
  name: string;
  type: ItemType;
  subType: string;
  size: number;
  grade: number;
  manufacturer: string;
  manufacturerCode: string;
  description?: string;
  // weapon stats
  dps?: number;
  damage?: number;
  fireRate?: number;
  range?: number;
  speed?: number;
  // shield
  shieldHp?: number;
  // quantum drive
  quantumSpeed?: number;
  quantumRange?: number;
  quantumFuelRequirement?: number;
  // power plant
  powerOutput?: number;
  // cooler
  coolingRate?: number;
  // mining
  miningPower?: number;
  instability?: number;
  resistance?: number;
  // economy
  buyPriceAuec?: number;
  buyAt?: string;
}

/* -------------------------------------------------------------------
   Shop — in-game shops with inventory and prices.
   ------------------------------------------------------------------- */

export interface ShopInventoryEntry {
  itemName: string;
  itemSlug: string;
  price: number;
  type: string;
}

export interface Shop {
  id: string;
  name: string;
  locationName: string;
  system: string;
  planet?: string;
  city?: string;
  type: string;
  inventory: ReadonlyArray<ShopInventoryEntry>;
}

/* -------------------------------------------------------------------
   Commodity — trade goods with buy/sell prices per terminal.
   ------------------------------------------------------------------- */

export interface CommodityPrice {
  terminal: string;
  location: string;
  price: number;
}

export interface Commodity {
  slug: string;
  name: string;
  kind: string;
  bestBuy?: CommodityPrice;
  bestSell?: CommodityPrice;
  spread?: number;
}

/* -------------------------------------------------------------------
   Location — starmap hierarchy: system → planet → moon → station.
   ------------------------------------------------------------------- */

export type LocationType =
  | "star"
  | "planet"
  | "moon"
  | "station"
  | "outpost"
  | "city"
  | "landing_zone";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parentId?: string;
  parentName?: string;
  description?: string;
  children?: ReadonlyArray<Location>;
}
