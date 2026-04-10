/**
 * Pure transform: UEX `/vehicles` row → canonical DB insert shapes.
 *
 * This file is a pure function. It imports ONLY types from `@sc-site/db`
 * (zero runtime DB access) and ONLY types from the Zod schemas (zero
 * runtime fetching). It takes `UexVehicleRow` in, returns insert payloads
 * out, deterministic for a given input.
 *
 * Decisions documented inline:
 *
 *  - UEX does not expose hardpoints or damage resistance. We return empty
 *    arrays for those; enrichment happens later from erkul / scunpacked.
 *  - UEX `crew` is a free-form string. We parse it into min / max by
 *    splitting on "," and taking the first/last numeric value.
 *  - `size` is inferred from SCU using a rough heuristic because UEX
 *    doesn't expose a size class directly. See `inferSizeFromScu` for the
 *    bracket.
 *  - `role` is picked as the highest-priority `is_*` flag per a hardcoded
 *    priority ladder. This is a UI convenience — the raw flags live in
 *    `flags_json` for anyone who wants the full truth.
 *  - `container_sizes` is a CSV like "1,2,4,8"; we parse to a numeric
 *    array and store it JSON-encoded via the typed JSON column.
 */

import type {
  NewDamageResistanceRow,
  NewHardpoint,
  NewManufacturer,
  NewVehicle,
  VehicleContainerSizesJson,
  VehicleFlagsJson,
  VehicleImageExtrasJson,
  VehicleSizeClass,
} from "@sc-site/db";
import { type UexVehicleFlagKey, type UexVehicleRow, uexVehicleFlagKeys } from "../schemas/uex";

/**
 * Output of the transform. Passed to the loader as-is.
 *
 * `manufacturer` is optional because a few UEX rows (rare) lack
 * `id_company` / `company_name` entirely. In that case the loader skips the
 * manufacturer upsert and leaves `vehicles.manufacturer_id` null.
 */
export interface UexVehicleTransformed {
  vehicle: NewVehicle;
  manufacturer: NewManufacturer | null;
  hardpoints: NewHardpoint[];
  damageResistance: NewDamageResistanceRow[];
}

/**
 * Size class heuristic based on SCU.
 *
 * Brackets (documented — no hardcoded ship names):
 *   - SCU < 5      → "Snub"     (fighters, snubs, racers)
 *   - SCU < 50     → "Small"    (small multirole)
 *   - SCU < 300    → "Medium"   (medium multirole class)
 *   - SCU < 3000   → "Large"    (large industrial / heavy combat class)
 *   - SCU >= 3000  → "Capital"  (capital-class hulls)
 *
 * SCU missing → null (no guess). This is the same bracket the UI legend
 * expects for the filter chips; it will be overridden by the Wiki+erkul
 * enrichment pass in a later wave.
 */
export function inferSizeFromScu(scu: number | null): VehicleSizeClass | null {
  if (scu === null || Number.isNaN(scu)) return null;
  if (scu < 5) return "Snub";
  if (scu < 50) return "Small";
  if (scu < 300) return "Medium";
  if (scu < 3000) return "Large";
  return "Capital";
}

/**
 * Role inference ladder. First matching flag wins.
 *
 * Priority rationale: the most specific role that distinguishes a ship
 * from "generic combat" comes first. A mining ship is primarily a mining
 * ship even if `is_military=1`; a dedicated exploration hull beats a
 * generic "starter" tag; etc. `starter` comes last because dozens of
 * starter ships also have other flags and we don't want everything to
 * collapse into "starter".
 */
const ROLE_PRIORITY: ReadonlyArray<{ flag: UexVehicleFlagKey; role: string }> = [
  { flag: "is_exploration", role: "exploration" },
  { flag: "is_medical", role: "medical" },
  { flag: "is_salvage", role: "salvage" },
  { flag: "is_mining", role: "mining" },
  { flag: "is_refinery", role: "refinery" },
  { flag: "is_refuel", role: "refuel" },
  { flag: "is_repair", role: "repair" },
  { flag: "is_construction", role: "construction" },
  { flag: "is_industrial", role: "industrial" },
  { flag: "is_datarunner", role: "datarunner" },
  { flag: "is_interdiction", role: "interdiction" },
  { flag: "is_stealth", role: "stealth" },
  { flag: "is_bomber", role: "bomber" },
  { flag: "is_military", role: "military" },
  { flag: "is_carrier", role: "carrier" },
  { flag: "is_cargo", role: "cargo" },
  { flag: "is_racing", role: "racing" },
  { flag: "is_passenger", role: "passenger" },
  { flag: "is_research", role: "research" },
  { flag: "is_science", role: "science" },
  { flag: "is_civilian", role: "civilian" },
  { flag: "is_ground_vehicle", role: "ground vehicle" },
  { flag: "is_starter", role: "starter" },
];

export function inferRoleFromFlags(flags: VehicleFlagsJson): string | null {
  for (const { flag, role } of ROLE_PRIORITY) {
    if (flags[flag] === true) return role;
  }
  return null;
}

/** Parse "1,2,4,8" → [1,2,4,8]. Drops non-numeric garbage. */
export function parseContainerSizes(raw: string | null): VehicleContainerSizesJson | null {
  if (raw === null) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  return parts.length === 0 ? null : parts;
}

/**
 * UEX crew is a free-form string. Examples observed in the real payload:
 *   "1", "6", "1,5", "1,2", "1,8", "2,5". Split on comma, take first and
 *   last numeric parts as min/max. Single-value strings collapse to
 *   min == max.
 */
export function parseCrew(raw: string | null): { min: number | null; max: number | null } {
  if (raw === null) return { min: null, max: null };
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  if (parts.length === 0) return { min: null, max: null };
  const first = parts[0];
  const last = parts[parts.length - 1];
  return {
    min: first ?? null,
    max: last ?? null,
  };
}

/** Collect the 35 UEX `is_*` flags into the canonical JSON bag. */
export function collectFlags(row: UexVehicleRow): VehicleFlagsJson {
  const out: VehicleFlagsJson = {};
  for (const key of uexVehicleFlagKeys) {
    const value = row[key];
    if (typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Build the extras JSON bag (urls that don't map to a dedicated column).
 */
function buildImagesExtras(row: UexVehicleRow): VehicleImageExtrasJson | null {
  const extras: VehicleImageExtrasJson = {};
  if (row.url_photos !== null) extras.url_photos = row.url_photos;
  // url_photo is promoted to a dedicated column, but we also keep a copy
  // in extras so downstream callers that only read `images_extras_json`
  // don't miss it. The column is the primary source for the UI though.
  if (row.url_photo !== null) extras.url_photo = row.url_photo;
  if (row.url_brochure !== null) extras.url_brochure = row.url_brochure;
  if (row.url_hotsite !== null) extras.url_hotsite = row.url_hotsite;
  if (row.url_video !== null) extras.url_video = row.url_video;
  return Object.keys(extras).length === 0 ? null : extras;
}

/**
 * Derive a deterministic manufacturer slug from the display name. UEX
 * doesn't expose a slug field on companies; we use the lowercase hyphenated
 * version of `company_name`.
 */
function slugifyCompany(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Main entry — map a single UEX `/vehicles` row into every canonical
 * insert payload. Throws if the row is missing a primary key or slug (the
 * loader can't recover from those).
 */
export function transformUexVehicle(row: UexVehicleRow): UexVehicleTransformed {
  if (row.id === null) {
    throw new Error("UEX vehicle row missing `id` — cannot transform");
  }
  if (row.slug === null) {
    throw new Error(`UEX vehicle row id=${row.id} missing \`slug\` — cannot transform`);
  }
  if (row.name === null) {
    throw new Error(`UEX vehicle row id=${row.id} missing \`name\` — cannot transform`);
  }

  const flags = collectFlags(row);
  const containerSizes = parseContainerSizes(row.container_sizes);
  const crew = parseCrew(row.crew);
  const imagesExtras = buildImagesExtras(row);
  const isConcept = flags.is_concept === true;
  const isGroundVehicle = flags.is_ground_vehicle === true;

  const vehicle: NewVehicle = {
    id: row.id,
    uuid: row.uuid,
    slug: row.slug,
    name: row.name,
    nameFull: row.name_full,
    manufacturerId: row.id_company,
    manufacturerName: row.company_name,
    role: inferRoleFromFlags(flags),
    size: inferSizeFromScu(row.scu),
    length: row.length,
    beam: row.width,
    height: row.height,
    massEmptyKg: row.mass,
    scu: row.scu,
    crewMin: crew.min !== null ? Math.trunc(crew.min) : null,
    crewMax: crew.max !== null ? Math.trunc(crew.max) : null,
    // Quantum / hydrogen: UEX exposes capacity ints; the schema names them
    // `quantum_fuel_uscu` and `hydrogen_l` — we preserve those units
    // verbatim (no scaling).
    quantumFuelUscu: row.fuel_quantum,
    hydrogenL: row.fuel_hydrogen,
    // The following columns are not exposed by UEX; they remain null until
    // the wiki / erkul enrichment pass fills them in:
    quantumRangeGm: null,
    vehicleBay: null,
    shieldHpTotal: null,
    hullHpMain: null,
    flagsJson: flags,
    containerSizesJson: containerSizes,
    urlPhoto: row.url_photo,
    urlStore: row.url_store,
    urlBrochure: row.url_brochure,
    urlHotsite: row.url_hotsite,
    urlVideo: row.url_video,
    imagesExtrasJson: imagesExtras,
    gameVersion: row.game_version,
    dateAdded: row.date_added,
    dateModified: row.date_modified,
    isConcept,
    isGroundVehicle,
  };

  let manufacturer: NewManufacturer | null = null;
  if (row.id_company !== null && row.company_name !== null) {
    manufacturer = {
      id: row.id_company,
      slug: slugifyCompany(row.company_name),
      name: row.company_name,
      // Remaining fields are enriched from the wiki later.
      nameCode: null,
      country: null,
      foundedYear: null,
      logoUrl: null,
      wikiUrl: null,
      storeUrl: null,
    };
  }

  return {
    vehicle,
    manufacturer,
    // UEX does not expose hardpoints — enrichment from erkul / scunpacked
    // happens in a later wave. Leaving the array empty is intentional.
    hardpoints: [],
    // Same for damage resistance.
    damageResistance: [],
  };
}
