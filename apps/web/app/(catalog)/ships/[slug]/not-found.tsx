import { BottomTextNav, ThreeCanvasPlaceholder, TopNav } from "@sc-site/ui";
import type { JSX } from "react";

/**
 * 404 state for `/ships/[slug]`. Rendered when the API returns HTTP 404
 * for the requested slug. MOCKUP.md §11 — no marketing copy, no modal,
 * no emojis, just a calm hairline panel floating over the hangar backdrop
 * and a link back to the fleet.
 */
export default function ShipNotFound(): JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <ThreeCanvasPlaceholder label="hangar scene — three.js mount point" />

      <TopNav showBack centerLabel="NOT FOUND" centerSub="unknown slug" />

      <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
        <div className="pointer-events-auto max-w-md px-8 py-6 bg-mantle/70 backdrop-blur-md border border-surface0 rounded-md relative">
          <div className="panel-hairline absolute inset-x-6 top-0" />
          <div className="text-10 tracking-micro text-overlay0 uppercase">no match</div>
          <div className="mt-2 text-14 text-text">that ship is not in the catalog</div>
          <div className="mt-1 text-12 text-subtext0">
            the slug did not resolve to a row in the DB.
          </div>
          <div className="mt-4 text-11 text-subtext0">
            <a
              href="/ships"
              className="text-text underline decoration-surface1 underline-offset-4 hover:decoration-text transition-colors duration-180 ease-deliberate"
            >
              ← back to the hangar
            </a>
          </div>
        </div>
      </div>

      <BottomTextNav active="hangar" />
    </main>
  );
}
