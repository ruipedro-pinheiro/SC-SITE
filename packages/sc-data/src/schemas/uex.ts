/**
 * Zod runtime validation for UEX API 2.0 responses.
 *
 * Ported (and trimmed to the subset this wave needs) from the previous
 * session at `sc-site-eb3fe870-ghost/packages/sc-data/src/schemas.ts`.
 *
 * Rationale for the "permissive" style:
 *
 *  - `.passthrough()` so unknown UEX fields don't fail parsing on new
 *    releases.
 *  - UEX stringifies numbers semi-randomly; every numeric field is coerced
 *    through a shared helper that accepts number | string | null.
 *  - `is_*` flags arrive as 0/1 ints, sometimes as strings; we normalise to
 *    proper TypeScript booleans at parse time.
 *
 * NO HARDCODE: this file describes shape, not values.
 */

import { z } from "zod";

/** Outer envelope every UEX endpoint wraps its data in. */
export const uexEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    status: z.string(),
    http_code: z.number().optional(),
    data: z.union([z.array(data), z.null()]).transform((d) => d ?? []),
  });

/** 0/1 (or stringified equivalents) → boolean. `null` / "" → false. */
const uexBool = z.union([z.number(), z.string(), z.boolean(), z.null()]).transform((v) => {
  if (typeof v === "boolean") return v;
  if (v === null || v === "") return false;
  return Number(v) === 1;
});

/** number | string | null → number | null. Trims blanks to null. */
const uexNum = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => {
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })
  .pipe(z.number().nullable());

/** number | string | null → int | null. */
const uexInt = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => {
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  })
  .pipe(z.number().int().nullable());

/** any primitive → trimmed string | null. */
const uexStr = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length === 0 ? null : s;
  })
  .pipe(z.string().nullable());

/**
 * Every `is_*` flag UEX exposes on `/vehicles`. Kept as a separate object so
 * the transform layer can iterate it without hand-writing 35 keys.
 */
export const uexVehicleFlagKeys = [
  "is_addon",
  "is_boarding",
  "is_bomber",
  "is_cargo",
  "is_carrier",
  "is_civilian",
  "is_concept",
  "is_construction",
  "is_datarunner",
  "is_docking",
  "is_emp",
  "is_exploration",
  "is_ground_vehicle",
  "is_hangar",
  "is_industrial",
  "is_interdiction",
  "is_loading_dock",
  "is_medical",
  "is_military",
  "is_mining",
  "is_passenger",
  "is_qed",
  "is_quantum_capable",
  "is_racing",
  "is_refinery",
  "is_refuel",
  "is_repair",
  "is_research",
  "is_salvage",
  "is_scanning",
  "is_science",
  "is_showdown_winner",
  "is_spaceship",
  "is_starter",
  "is_stealth",
  "is_tractor_beam",
] as const satisfies readonly string[];

export type UexVehicleFlagKey = (typeof uexVehicleFlagKeys)[number];

const vehicleFlagsShape: Record<UexVehicleFlagKey, typeof uexBool> = Object.fromEntries(
  uexVehicleFlagKeys.map((k) => [k, uexBool] as const),
) as Record<UexVehicleFlagKey, typeof uexBool>;

/**
 * UEX `/vehicles` row schema. We model every field documented in
 * `SOURCES.md §1` and the sample payload at `/tmp/uex-vehicles-raw.json`.
 */
export const uexVehicleSchema = z
  .object({
    id: uexInt,
    id_company: uexInt,
    id_parent: uexInt,
    ids_vehicles_loaners: uexStr,
    name: uexStr,
    name_full: uexStr,
    slug: uexStr,
    uuid: uexStr,
    scu: uexInt,
    /** UEX returns this as a free-form string: "1", "6", "1,5", "1,2,3". */
    crew: uexStr,
    mass: uexInt,
    width: uexNum,
    height: uexNum,
    length: uexNum,
    fuel_quantum: uexInt,
    fuel_hydrogen: uexInt,
    container_sizes: uexStr,
    ...vehicleFlagsShape,
    url_photo: uexStr,
    url_store: uexStr,
    url_brochure: uexStr,
    url_hotsite: uexStr,
    url_video: uexStr,
    url_photos: uexStr,
    pad_type: uexStr,
    game_version: uexStr,
    company_name: uexStr,
    date_added: uexInt,
    date_modified: uexInt,
  })
  .passthrough();

export type UexVehicleRow = z.infer<typeof uexVehicleSchema>;

/** The full `/vehicles` envelope, for callers that want status/http_code. */
export const uexVehiclesResponseSchema = uexEnvelope(uexVehicleSchema);
export type UexVehiclesResponse = z.infer<typeof uexVehiclesResponseSchema>;
