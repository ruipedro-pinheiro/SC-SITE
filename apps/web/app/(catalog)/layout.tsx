import type { ReactNode } from "react";

interface CatalogLayoutProps {
  children: ReactNode;
}

/**
 * Wrapper for every route inside the catalog group: /ships, /ships/[slug],
 * and (eventually) /map, /trade, /mining.
 *
 * MOCKUP.md §11 explicitly bans:
 *   - <ScanLines />, <CursorSpotlight />, <Starfield /> (DOM starfield)
 *   - any wordmark, top nav, sidebar, hamburger
 *
 * The actual chrome (TopNav, BottomTextNav) is rendered per-page so each
 * route can pass the right `active` link and `centerLabel` without funneling
 * through context. This layout is therefore a thin pass-through.
 */
export default function CatalogLayout({ children }: CatalogLayoutProps) {
  return <div className="relative min-h-screen overflow-hidden">{children}</div>;
}
