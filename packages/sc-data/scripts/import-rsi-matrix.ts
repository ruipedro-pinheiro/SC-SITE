#!/usr/bin/env bun
/**
 * Enrich vehicles with RSI ship matrix data.
 *
 * Source: ~/sc-data/rsi_ship_matrix.json (250 ships)
 * Adds: production_status (flight-ready / in-concept), RSI mass as fallback,
 *       RSI URL for pledge page.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sqlite } from "@sc-site/db";

const HOME = process.env.HOME ?? "/home/pedro";

interface RsiShip {
  name: string;
  mass: number;
  production_status: string;
  url: string;
  scm_speed: number;
  afterburner_speed: number;
  min_crew: number;
  max_crew: number;
  cargocapacity: number;
  focus: string;
  manufacturer: { name: string; code: string };
}

const rsiData = JSON.parse(readFileSync(resolve(HOME, "sc-data/rsi_ship_matrix.json"), "utf8")) as {
  data: RsiShip[];
};

function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const rsiByNorm = new Map<string, RsiShip>();
for (const s of rsiData.data) {
  rsiByNorm.set(norm(s.name), s);
}

const dbVehicles = sqlite
  .query("SELECT id, name, name_full, mass_empty_kg, flags_json, is_concept FROM vehicles")
  .all() as Array<{
  id: number;
  name: string;
  name_full: string | null;
  mass_empty_kg: number | null;
  flags_json: string | null;
  is_concept: number;
}>;

const updateStmt = sqlite.prepare(`
  UPDATE vehicles SET
    mass_empty_kg = CASE WHEN (mass_empty_kg IS NULL OR mass_empty_kg = 0) AND ? > 0 THEN ? ELSE mass_empty_kg END,
    is_concept = ?,
    flags_json = ?,
    updated_at = ?
  WHERE id = ?
`);

let matched = 0;
const tsMs = Date.now();

const tx = sqlite.transaction(() => {
  for (const v of dbVehicles) {
    const displayName = v.name_full ?? v.name;
    const rsi = rsiByNorm.get(norm(displayName)) ?? rsiByNorm.get(norm(v.name));
    if (!rsi) continue;

    const flags: Record<string, unknown> = v.flags_json ? JSON.parse(v.flags_json) : {};
    const isConcept = rsi.production_status === "in-concept";

    flags._production_status = rsi.production_status;
    flags._rsi_url = `https://robertsspaceindustries.com${rsi.url}`;
    flags._rsi_focus = rsi.focus;

    // Use RSI mass as fallback if scunpacked didn't have it
    const rsiMassKg = rsi.mass > 0 ? rsi.mass : 0;

    updateStmt.run(rsiMassKg, rsiMassKg, isConcept ? 1 : 0, JSON.stringify(flags), tsMs, v.id);
    matched++;
  }
});

tx();

console.error(
  JSON.stringify(
    {
      totalRsi: rsiData.data.length,
      matched,
      totalDb: dbVehicles.length,
      status: "ok",
    },
    null,
    2,
  ),
);
