import { PanelShell, ThreeCanvasPlaceholder, TopNav } from "@sc-site/ui";

/**
 * Loading skeleton for the ship detail page. Renders the same panel layout
 * with pulsing placeholders while the server component awaits the API.
 */
export default function ShipDetailLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <ThreeCanvasPlaceholder label="loading..." />
      <TopNav showBack />

      {/* identity panel skeleton */}
      <PanelShell as="aside" className="fixed left-10 z-40" style={{ top: "96px", width: "320px" }}>
        <div className="animate-pulse">
          <div className="h-3 w-24 bg-surface0 rounded-sm" />
          <div className="h-7 w-48 bg-surface0 rounded-sm mt-2" />
          <div className="h-3 w-32 bg-surface0 rounded-sm mt-3" />
          <div className="h-px w-full bg-surface0 mt-4" />
          <div className="space-y-3 mt-4">
            <div className="h-4 w-full bg-surface0 rounded-sm" />
            <div className="h-4 w-full bg-surface0 rounded-sm" />
            <div className="h-4 w-3/4 bg-surface0 rounded-sm" />
          </div>
        </div>
      </PanelShell>

      {/* combat panel skeleton */}
      <PanelShell
        as="aside"
        className="fixed z-40"
        style={{ bottom: "64px", right: "416px", width: "320px" }}
      >
        <div className="animate-pulse">
          <div className="h-3 w-16 bg-surface0 rounded-sm mb-4" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-surface0 rounded-sm" />
            <div className="h-4 w-full bg-surface0 rounded-sm" />
            <div className="h-4 w-2/3 bg-surface0 rounded-sm" />
          </div>
        </div>
      </PanelShell>
    </main>
  );
}
