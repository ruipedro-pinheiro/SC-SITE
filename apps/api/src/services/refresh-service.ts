/**
 * Wrapper around the UEX vehicles refresh orchestrator.
 *
 * TODO: wire to @sc-site/sc-data once wave 2 sibling agent finishes.
 * The wave 2 agent will expose `runUexVehiclesRefresh()` from
 * `@sc-site/sc-data` at `packages/sc-data/src/orchestrator/refresh-uex-vehicles.ts`.
 * When it lands, replace the body of `runUexVehiclesRefresh()` below with:
 *
 *   import { runUexVehiclesRefresh as impl } from "@sc-site/sc-data";
 *   return impl();
 *
 * The wave 4 (ingestion-runner) agent will verify the real wiring end-to-end.
 *
 * For now we return a typed zero-stats payload so /admin/refresh/vehicles
 * responds with a valid envelope and the web/admin UI can be wired first.
 */

export interface RefreshStats {
  inserted: number;
  updated: number;
  unchanged: number;
  errors: ReadonlyArray<string>;
}

export async function runUexVehiclesRefresh(): Promise<RefreshStats> {
  // Placeholder until wave 2 ships the real orchestrator.
  return {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  };
}
