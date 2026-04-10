#!/usr/bin/env bun
/**
 * Import cstone shops and shop inventory into the database.
 *
 * Usage:
 *   bun run packages/sc-data/scripts/import-cstone.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sqlite } from "@sc-site/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface CstoneShopItem {
  ItemId: string;
  name: string;
  type: string;
  size: number | null;
  price: number;
}

function main(): void {
  const basePath = resolve(process.env.HOME ?? "/home/pedro", "sc-data");
  const cstoneAll = JSON.parse(
    readFileSync(resolve(basePath, "cstone_all.json"), "utf8"),
  ) as Record<string, unknown>;

  const shopsData = cstoneAll.shops as Record<string, CstoneShopItem[]>;
  const ts = new Date();

  let shopCount = 0;
  let inventoryCount = 0;

  // Wrap in a transaction for performance and to avoid SQLITE_BUSY
  const insertShop = sqlite.prepare(
    "INSERT INTO shops (name, slug, source, updated_at) VALUES (?, ?, 'cstone', ?) ON CONFLICT(name) DO UPDATE SET updated_at = ? RETURNING id",
  );
  const deleteInv = sqlite.prepare("DELETE FROM shop_inventory WHERE shop_id = ?");
  const insertInv = sqlite.prepare(
    "INSERT INTO shop_inventory (shop_id, item_id, item_name, item_type, item_size, price, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const tsMs = ts.getTime();

  const runAll = sqlite.transaction(() => {
    for (const [shopName, items] of Object.entries(shopsData)) {
      const slug = slugify(shopName);

      const row = insertShop.get(shopName, slug, tsMs, tsMs) as { id: number } | null;
      if (!row) continue;
      const shopId = row.id;
      shopCount++;

      deleteInv.run(shopId);

      for (const item of items) {
        insertInv.run(
          shopId,
          item.ItemId || null,
          item.name || null,
          item.type || null,
          item.size ?? null,
          item.price ?? null,
          tsMs,
        );
        inventoryCount++;
      }
    }
  });

  runAll();

  console.error(
    JSON.stringify({ shops: shopCount, inventory: inventoryCount, status: "ok" }, null, 2),
  );
}

main();
