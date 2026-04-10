/**
 * Hono RPC client for the sc-site backend.
 *
 * The type parameter `AppType` is walked by `hc<AppType>(...)` to derive fully
 * typed request/response shapes for every route in apps/api. Response
 * bodies are inferred directly from the `c.json(...)` calls in the handlers,
 * so there are no hand-written DTOs in apps/web.
 *
 * Env resolution (server components run on the server — on the Pi — so
 * `localhost:3001` is the correct default):
 *
 *   1. `API_BASE_URL`              — server-side only, preferred for SC pages
 *      that render in Next's node runtime.
 *   2. `NEXT_PUBLIC_API_BASE_URL`  — exposed to the browser; used when a
 *      client component needs to call the API directly.
 *   3. `http://localhost:3001`     — dev fallback (API + web co-located on
 *      the Pi).
 */

import type { AppType } from "@sc-site/api/types";
import type { Ship } from "@sc-site/ui";
import { hc } from "hono/client";

const API_BASE =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export const api = hc<AppType>(API_BASE);
export type Api = typeof api;

/**
 * JSON-deserialized ship payload as inferred from the Hono RPC `c.json(...)`
 * call on the `GET /vehicles/:slug` handler. Hono's type walker turns every
 * optional `foo?: T` into `foo: T | undefined` because that is how the JSON
 * boundary actually materialises optionals.
 *
 * Under `exactOptionalPropertyTypes: true`, a field typed `T | undefined`
 * cannot be passed where a field typed `T?` is expected — so we cannot feed
 * the raw RPC result directly to the `@sc-site/ui` panels whose props use
 * the `Ship` interface. `toShip` is the single bridging adapter: it drops
 * `undefined` optionals so the result is assignable to `Ship`.
 */
type RawDamageRow = {
  readonly multiplier: number;
  readonly fillPct: number;
  readonly accent?: "sky" | "peach" | undefined;
};

type RawShip = {
  readonly slug: string;
  readonly name: string;
  readonly manufacturer: string;
  readonly manufacturerCode: string;
  readonly role: string;
  readonly size: Ship["size"];
  readonly isConcept: boolean;
  readonly length: number;
  readonly beam: number;
  readonly height: number;
  readonly massEmpty: number;
  readonly scu: number;
  readonly crewMin: number;
  readonly crewMax: number;
  readonly scmSpeed?: number | undefined;
  readonly maxSpeed?: number | undefined;
  readonly quantumRangeGm?: number | undefined;
  readonly quantumFuelUscu?: number | undefined;
  readonly hydrogenL?: number | undefined;
  readonly vehicleBay?: string | undefined;
  readonly shieldHp: number;
  readonly hullHp: number;
  readonly hardpoints: ReadonlyArray<{
    readonly id: string;
    readonly size: number;
    readonly location: Ship["hardpoints"][number]["location"];
    readonly type: Ship["hardpoints"][number]["type"];
    readonly weapon?: string | undefined;
  }>;
  readonly damageResistance: {
    readonly physical: RawDamageRow;
    readonly distortion: RawDamageRow;
    readonly energy: RawDamageRow;
    readonly thermal: RawDamageRow;
    readonly biochemical: RawDamageRow;
  };
  readonly buyPriceAuec?: number | undefined;
  readonly buyAt?: string | undefined;
  readonly pledgeStoreUrl?: string | undefined;
  readonly pledgeUsd?: number | undefined;
  readonly photo?: string | undefined;
  readonly history: ReadonlyArray<{
    readonly version: string;
    readonly date: string;
    readonly summary: string;
    readonly category: Ship["history"][number]["category"];
  }>;
};

function toDamageRow(row: RawDamageRow): Ship["damageResistance"]["physical"] {
  const accent = row.accent;
  return accent !== undefined
    ? { multiplier: row.multiplier, fillPct: row.fillPct, accent }
    : { multiplier: row.multiplier, fillPct: row.fillPct };
}

/**
 * Drop `undefined` optionals so the object satisfies `Ship` under
 * `exactOptionalPropertyTypes`. No field is fabricated — we only omit
 * keys that the API did not send.
 */
export function toShip(raw: RawShip): Ship {
  const ship: Ship = {
    slug: raw.slug,
    name: raw.name,
    manufacturer: raw.manufacturer,
    manufacturerCode: raw.manufacturerCode,
    role: raw.role,
    size: raw.size,
    isConcept: raw.isConcept,
    length: raw.length,
    beam: raw.beam,
    height: raw.height,
    massEmpty: raw.massEmpty,
    scu: raw.scu,
    crewMin: raw.crewMin,
    crewMax: raw.crewMax,
    shieldHp: raw.shieldHp,
    hullHp: raw.hullHp,
    hardpoints: raw.hardpoints.map((h) => {
      const weapon = h.weapon;
      return weapon !== undefined
        ? { id: h.id, size: h.size, location: h.location, type: h.type, weapon }
        : { id: h.id, size: h.size, location: h.location, type: h.type };
    }),
    damageResistance: {
      physical: toDamageRow(raw.damageResistance.physical),
      distortion: toDamageRow(raw.damageResistance.distortion),
      energy: toDamageRow(raw.damageResistance.energy),
      thermal: toDamageRow(raw.damageResistance.thermal),
      biochemical: toDamageRow(raw.damageResistance.biochemical),
    },
    history: raw.history.map((h) => ({
      version: h.version,
      date: h.date,
      summary: h.summary,
      category: h.category,
    })),
  };
  if (raw.scmSpeed !== undefined) ship.scmSpeed = raw.scmSpeed;
  if (raw.maxSpeed !== undefined) ship.maxSpeed = raw.maxSpeed;
  if (raw.quantumRangeGm !== undefined) ship.quantumRangeGm = raw.quantumRangeGm;
  if (raw.quantumFuelUscu !== undefined) ship.quantumFuelUscu = raw.quantumFuelUscu;
  if (raw.hydrogenL !== undefined) ship.hydrogenL = raw.hydrogenL;
  if (raw.vehicleBay !== undefined) ship.vehicleBay = raw.vehicleBay;
  if (raw.buyPriceAuec !== undefined) ship.buyPriceAuec = raw.buyPriceAuec;
  if (raw.buyAt !== undefined) ship.buyAt = raw.buyAt;
  if (raw.pledgeStoreUrl !== undefined) ship.pledgeStoreUrl = raw.pledgeStoreUrl;
  if (raw.pledgeUsd !== undefined) ship.pledgeUsd = raw.pledgeUsd;
  if (raw.photo !== undefined) ship.photo = raw.photo;
  return ship;
}
