import { BottomTextNav, TopNav } from "@sc-site/ui";

/**
 * Loading skeleton for the ships list page. Shows a grid of pulsing
 * placeholder cards while the server component awaits the API.
 */
export default function ShipsLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-crust">
      <TopNav centerLabel="HANGAR" />

      <div className="relative z-20 mx-auto mt-20 px-6 max-w-7xl">
        {/* search skeleton */}
        <div className="h-12 w-full max-w-md bg-surface0 rounded-md animate-pulse mb-6" />

        {/* grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 24 }, (_, i) => `skeleton-${i}`).map((key) => (
            <div key={key} className="panel p-4 animate-pulse">
              <div className="w-full aspect-video rounded-sm bg-surface0" />
              <div className="h-3 w-3/4 bg-surface0 rounded-sm mt-3" />
              <div className="h-2 w-1/2 bg-surface0 rounded-sm mt-2" />
            </div>
          ))}
        </div>
      </div>

      <BottomTextNav active="hangar" />
    </main>
  );
}
