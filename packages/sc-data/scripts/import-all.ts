#!/usr/bin/env bun
/**
 * Run all import scripts in sequence.
 *
 * Order matters: erkul first (items), then cstone (shops referencing items),
 * then UEX prices (commodities + terminals + prices), then starmap.
 *
 * Usage:
 *   bun run packages/sc-data/scripts/import-all.ts
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const BUN = resolve(process.env.HOME ?? "/home/pedro", ".bun/bin/bun");
const SCRIPTS_DIR = import.meta.dir;

const scripts = [
  { name: "import-erkul", file: "import-erkul.ts" },
  { name: "import-cstone", file: "import-cstone.ts" },
  { name: "import-uex-prices", file: "import-uex-prices.ts" },
  { name: "import-starmap", file: "import-starmap.ts" },
];

let failed = false;

for (const script of scripts) {
  const scriptPath = resolve(SCRIPTS_DIR, script.file);
  console.error(`\n=== Running ${script.name} ===`);

  const result = spawnSync(BUN, ["run", scriptPath], {
    stdio: ["inherit", "inherit", "inherit"],
    cwd: resolve(SCRIPTS_DIR, "../../.."),
  });

  if (result.status !== 0) {
    console.error(`FAILED: ${script.name} exited with code ${result.status}`);
    failed = true;
    break;
  }
}

if (failed) {
  console.error("\nimport-all: one or more imports failed");
  process.exit(1);
} else {
  console.error("\nimport-all: all imports completed successfully");
}
