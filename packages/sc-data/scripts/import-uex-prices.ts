#!/usr/bin/env bun
/**
 * Import UEX commodities, terminals, and commodity prices.
 *
 * Usage:
 *   bun run packages/sc-data/scripts/import-uex-prices.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type CommodityFlagsJson,
  type TerminalFlagsJson,
  commodities,
  commodityPrices,
  db,
  sqlite,
  terminals,
} from "@sc-site/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface UexCommodity {
  id: number;
  id_parent: number;
  name: string;
  code: string;
  kind: string;
  weight_scu: number;
  price_buy: number;
  price_sell: number;
  wiki: string;
  date_added: number;
  date_modified: number;
  [key: string]: unknown;
}

interface UexTerminal {
  id: number;
  name: string;
  fullname: string;
  nickname: string;
  displayname: string;
  code: string;
  type: string;
  id_star_system: number;
  id_planet: number;
  id_orbit: number;
  id_moon: number;
  id_space_station: number;
  id_outpost: number;
  id_city: number;
  id_faction: number;
  id_company: number;
  id_poi: number;
  star_system_name: string;
  planet_name: string;
  orbit_name: string;
  moon_name: string | null;
  space_station_name: string | null;
  outpost_name: string | null;
  city_name: string | null;
  faction_name: string;
  company_name: string;
  max_container_size: number;
  mcs: number;
  game_version: string;
  date_added: number;
  date_modified: number;
  [key: string]: unknown;
}

interface UexCommodityPrice {
  id: number;
  id_commodity: number;
  id_terminal: number;
  price_buy: number;
  price_buy_min: number;
  price_buy_max: number;
  price_buy_avg: number;
  price_sell: number;
  price_sell_min: number;
  price_sell_max: number;
  price_sell_avg: number;
  scu_buy: number;
  scu_buy_avg: number;
  scu_sell_stock: number;
  scu_sell: number;
  scu_sell_avg: number;
  status_buy: number;
  status_sell: number;
  volatility_price_buy: number;
  volatility_price_sell: number;
  commodity_name: string;
  commodity_code: string;
  terminal_name: string;
  star_system_name: string;
  container_sizes: string;
  game_version: string;
  date_added: number;
  date_modified: number;
  [key: string]: unknown;
}

function main(): void {
  const basePath = resolve(process.env.HOME ?? "/home/pedro", "sc-data");
  const ts = new Date();

  // 1. Import commodities
  const commsRaw = JSON.parse(
    readFileSync(resolve(basePath, "uex_commodities.json"), "utf8"),
  ) as UexCommodity[];

  let commCount = 0;
  let termCount = 0;
  let priceCount = 0;

  // Disable FK checks during bulk import — some price rows reference
  // terminals not in the UEX snapshot (e.g. removed locations).
  sqlite.run("PRAGMA foreign_keys = OFF");

  // Wrap all three imports in a single transaction
  const runAll = sqlite.transaction(() => {
    // 1a. Import commodities
    for (const c of commsRaw) {
      const flags: CommodityFlagsJson = {};
      for (const key of Object.keys(c)) {
        if (key.startsWith("is_")) {
          (flags as Record<string, boolean>)[key] = c[key] === 1;
        }
      }

      db.insert(commodities)
        .values({
          id: c.id,
          idParent: c.id_parent || null,
          name: c.name,
          code: c.code || null,
          slug: slugify(c.name),
          kind: c.kind || null,
          weightScu: c.weight_scu ?? null,
          priceBuy: c.price_buy ?? null,
          priceSell: c.price_sell ?? null,
          flagsJson: flags,
          wiki: c.wiki || null,
          dateAdded: c.date_added ?? null,
          dateModified: c.date_modified ?? null,
          updatedAt: ts,
        })
        .onConflictDoUpdate({
          target: commodities.id,
          set: {
            name: c.name,
            code: c.code || null,
            slug: slugify(c.name),
            kind: c.kind || null,
            weightScu: c.weight_scu ?? null,
            priceBuy: c.price_buy ?? null,
            priceSell: c.price_sell ?? null,
            flagsJson: flags,
            wiki: c.wiki || null,
            dateAdded: c.date_added ?? null,
            dateModified: c.date_modified ?? null,
            updatedAt: ts,
          },
        })
        .run();
      commCount++;
    }

    // 1b. Import terminals
    const termsRaw = JSON.parse(
      readFileSync(resolve(basePath, "uex_terminals.json"), "utf8"),
    ) as UexTerminal[];

    for (const t of termsRaw) {
      const flags: TerminalFlagsJson = {};
      for (const key of Object.keys(t)) {
        if (key.startsWith("is_") || key.startsWith("has_")) {
          (flags as Record<string, boolean>)[key] = t[key] === 1;
        }
      }

      db.insert(terminals)
        .values({
          id: t.id,
          name: t.name,
          fullname: t.fullname || null,
          nickname: t.nickname || null,
          displayname: t.displayname || null,
          code: t.code || null,
          slug: `${slugify(t.name)}-${t.id}`,
          type: t.type || null,
          idStarSystem: t.id_star_system || null,
          idPlanet: t.id_planet || null,
          idOrbit: t.id_orbit || null,
          idMoon: t.id_moon || null,
          idSpaceStation: t.id_space_station || null,
          idOutpost: t.id_outpost || null,
          idCity: t.id_city || null,
          idFaction: t.id_faction || null,
          idCompany: t.id_company || null,
          starSystemName: t.star_system_name || null,
          planetName: t.planet_name || null,
          orbitName: t.orbit_name || null,
          moonName: t.moon_name || null,
          spaceStationName: t.space_station_name || null,
          outpostName: t.outpost_name || null,
          cityName: t.city_name || null,
          factionName: t.faction_name || null,
          companyName: t.company_name || null,
          flagsJson: flags,
          maxContainerSize: t.max_container_size ?? null,
          mcs: t.mcs ?? null,
          gameVersion: t.game_version || null,
          dateAdded: t.date_added ?? null,
          dateModified: t.date_modified ?? null,
          updatedAt: ts,
        })
        .onConflictDoUpdate({
          target: terminals.id,
          set: {
            name: t.name,
            fullname: t.fullname || null,
            nickname: t.nickname || null,
            displayname: t.displayname || null,
            code: t.code || null,
            slug: `${slugify(t.name)}-${t.id}`,
            type: t.type || null,
            idStarSystem: t.id_star_system || null,
            idPlanet: t.id_planet || null,
            idOrbit: t.id_orbit || null,
            idMoon: t.id_moon || null,
            idSpaceStation: t.id_space_station || null,
            idOutpost: t.id_outpost || null,
            idCity: t.id_city || null,
            idFaction: t.id_faction || null,
            idCompany: t.id_company || null,
            starSystemName: t.star_system_name || null,
            planetName: t.planet_name || null,
            orbitName: t.orbit_name || null,
            moonName: t.moon_name || null,
            spaceStationName: t.space_station_name || null,
            outpostName: t.outpost_name || null,
            cityName: t.city_name || null,
            factionName: t.faction_name || null,
            companyName: t.company_name || null,
            flagsJson: flags,
            maxContainerSize: t.max_container_size ?? null,
            mcs: t.mcs ?? null,
            gameVersion: t.game_version || null,
            dateAdded: t.date_added ?? null,
            dateModified: t.date_modified ?? null,
            updatedAt: ts,
          },
        })
        .run();
      termCount++;
    }

    // 1c. Import commodity prices
    const pricesRaw = JSON.parse(
      readFileSync(resolve(basePath, "uex_commodity_prices.json"), "utf8"),
    ) as UexCommodityPrice[];

    for (const p of pricesRaw) {
      db.insert(commodityPrices)
        .values({
          id: p.id,
          idCommodity: p.id_commodity,
          idTerminal: p.id_terminal,
          priceBuy: p.price_buy ?? null,
          priceBuyMin: p.price_buy_min ?? null,
          priceBuyMax: p.price_buy_max ?? null,
          priceBuyAvg: p.price_buy_avg ?? null,
          priceSell: p.price_sell ?? null,
          priceSellMin: p.price_sell_min ?? null,
          priceSellMax: p.price_sell_max ?? null,
          priceSellAvg: p.price_sell_avg ?? null,
          scuBuy: p.scu_buy ?? null,
          scuBuyAvg: p.scu_buy_avg ?? null,
          scuSellStock: p.scu_sell_stock ?? null,
          scuSell: p.scu_sell ?? null,
          scuSellAvg: p.scu_sell_avg ?? null,
          statusBuy: p.status_buy ?? null,
          statusSell: p.status_sell ?? null,
          volatilityPriceBuy: p.volatility_price_buy ?? null,
          volatilityPriceSell: p.volatility_price_sell ?? null,
          commodityName: p.commodity_name || null,
          commodityCode: p.commodity_code || null,
          terminalName: p.terminal_name || null,
          starSystemName: p.star_system_name || null,
          containerSizes: p.container_sizes || null,
          gameVersion: p.game_version || null,
          dateAdded: p.date_added ?? null,
          dateModified: p.date_modified ?? null,
          updatedAt: ts,
        })
        .onConflictDoUpdate({
          target: commodityPrices.id,
          set: {
            idCommodity: p.id_commodity,
            idTerminal: p.id_terminal,
            priceBuy: p.price_buy ?? null,
            priceBuyMin: p.price_buy_min ?? null,
            priceBuyMax: p.price_buy_max ?? null,
            priceBuyAvg: p.price_buy_avg ?? null,
            priceSell: p.price_sell ?? null,
            priceSellMin: p.price_sell_min ?? null,
            priceSellMax: p.price_sell_max ?? null,
            priceSellAvg: p.price_sell_avg ?? null,
            scuBuy: p.scu_buy ?? null,
            scuBuyAvg: p.scu_buy_avg ?? null,
            scuSellStock: p.scu_sell_stock ?? null,
            scuSell: p.scu_sell ?? null,
            scuSellAvg: p.scu_sell_avg ?? null,
            statusBuy: p.status_buy ?? null,
            statusSell: p.status_sell ?? null,
            volatilityPriceBuy: p.volatility_price_buy ?? null,
            volatilityPriceSell: p.volatility_price_sell ?? null,
            commodityName: p.commodity_name || null,
            commodityCode: p.commodity_code || null,
            terminalName: p.terminal_name || null,
            starSystemName: p.star_system_name || null,
            containerSizes: p.container_sizes || null,
            gameVersion: p.game_version || null,
            dateAdded: p.date_added ?? null,
            dateModified: p.date_modified ?? null,
            updatedAt: ts,
          },
        })
        .run();
      priceCount++;
    }
  });

  runAll();
  sqlite.run("PRAGMA foreign_keys = ON");

  console.error(
    JSON.stringify(
      { commodities: commCount, terminals: termCount, prices: priceCount, status: "ok" },
      null,
      2,
    ),
  );
}

main();
