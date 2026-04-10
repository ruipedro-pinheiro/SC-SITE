#!/usr/bin/env bun
/**
 * Import starmap.json into the locations table.
 *
 * Usage:
 *   bun run packages/sc-data/scripts/import-starmap.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, locations, sqlite } from "@sc-site/db";

interface StarmapLocation {
  name: string;
  description: string;
  type: string;
  navIcon: string;
  hideInStarmap: string;
  jurisdiction: string;
  parent: string;
  size: string;
  reference: string;
  path: string;
}

function main(): void {
  const dataPath = resolve(process.env.HOME ?? "/home/pedro", "sc-data/json-out/starmap.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf8")) as StarmapLocation[];
  const ts = new Date();

  let count = 0;

  const runAll = sqlite.transaction(() => {
    for (const loc of raw) {
      if (!loc.reference) continue;

      db.insert(locations)
        .values({
          reference: loc.reference,
          name: loc.name || "Unknown",
          description: loc.description || null,
          type: loc.type || null,
          navIcon: loc.navIcon || null,
          hideInStarmap: loc.hideInStarmap === "1",
          jurisdiction: loc.jurisdiction || null,
          parent: loc.parent || null,
          size: loc.size ? Number.parseFloat(loc.size) : null,
          path: loc.path || null,
          updatedAt: ts,
        })
        .onConflictDoUpdate({
          target: locations.reference,
          set: {
            name: loc.name || "Unknown",
            description: loc.description || null,
            type: loc.type || null,
            navIcon: loc.navIcon || null,
            hideInStarmap: loc.hideInStarmap === "1",
            jurisdiction: loc.jurisdiction || null,
            parent: loc.parent || null,
            size: loc.size ? Number.parseFloat(loc.size) : null,
            path: loc.path || null,
            updatedAt: ts,
          },
        })
        .run();
      count++;
    }
  });

  runAll();

  console.error(JSON.stringify({ locations: count, status: "ok" }, null, 2));
}

main();
