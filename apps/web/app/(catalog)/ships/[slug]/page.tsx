import { ShipViewer3DWrapper } from "@/components/ShipViewer3DWrapper";
import { ErrorState } from "@/components/error-state";
import { api, toShip } from "@/lib/api";
import {
  BottomTextNav,
  CombatPanel,
  IdentityPanel,
  LogisticsPanel,
  PanelShell,
  TopNav,
} from "@sc-site/ui";
import { notFound } from "next/navigation";

interface ShipDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0;

/** Ships that have a GLB model in public/ships/ */
const SHIPS_WITH_GLB = new Set([
  "100i",
  "300i",
  "400i",
  "600i",
  "890-jump",
  "arrow",
  "aurora",
  "avenger-titan",
  "c2-hercules",
  "carrack",
  "caterpillar",
  "constellation",
  "corsair",
  "cutlass-black",
  "eclipse",
  "freelancer",
  "gladius",
  "hammerhead",
  "hurricane",
  "idris",
  "javelin",
  "mercury",
  "polaris",
  "prospector",
  "reclaimer",
  "redeemer",
  "retaliator",
  "sabre",
  "scorpius",
  "vulture",
]);

function slugToGlb(slug: string): string | null {
  if (SHIPS_WITH_GLB.has(slug)) return `/ships/${slug}.glb`;
  for (const base of SHIPS_WITH_GLB) {
    if (slug.startsWith(base)) return `/ships/${base}.glb`;
  }
  return null;
}

function shopSearchHref(shop: string): string {
  return `/shops?q=${encodeURIComponent(shop)}`;
}

/** Strip the manufacturer prefix from ship name for the hero display. */
function extractModelName(name: string, manufacturer: string): string {
  const prefix = manufacturer.split(" ")[0] ?? "";
  if (prefix && name.toLowerCase().startsWith(prefix.toLowerCase())) {
    const stripped = name.slice(prefix.length).trim();
    if (stripped.length > 0) return stripped;
  }
  return name;
}

export default async function ShipDetailPage({ params }: ShipDetailPageProps) {
  const { slug } = await params;

  let shipRes: Awaited<ReturnType<(typeof api.vehicles)[":slug"]["$get"]>>;
  try {
    shipRes = await api.vehicles[":slug"].$get({ param: { slug } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    return <ErrorState code={0} message={message} retryHref={`/ships/${slug}`} />;
  }

  if (shipRes.status === 404) {
    notFound();
  }
  if (!shipRes.ok) {
    return <ErrorState code={shipRes.status} retryHref={`/ships/${slug}`} />;
  }

  const shipBody = await shipRes.json();
  if (!("data" in shipBody)) {
    return <ErrorState code={shipRes.status} retryHref={`/ships/${slug}`} />;
  }
  const ship = toShip(shipBody.data);
  const glbUrl = slugToGlb(slug);
  const modelName = extractModelName(ship.name, ship.manufacturer);

  let prev: { slug: string; name: string } | undefined;
  let next: { slug: string; name: string } | undefined;
  try {
    const listRes = await api.vehicles.$get({ query: { limit: "500" } });
    if (listRes.ok) {
      const listBody = await listRes.json();
      if ("data" in listBody) {
        const list = listBody.data;
        const idx = list.findIndex((s) => s.slug === slug);
        if (idx !== -1 && list.length > 1) {
          const prevIdx = idx > 0 ? idx - 1 : list.length - 1;
          const nextIdx = idx < list.length - 1 ? idx + 1 : 0;
          const prevShip = list[prevIdx];
          const nextShip = list[nextIdx];
          if (prevShip) prev = { slug: prevShip.slug, name: prevShip.name };
          if (nextShip) next = { slug: nextShip.slug, name: nextShip.name };
        }
      }
    }
  } catch {
    // swallow — prev/next are decorative.
  }

  const weaponHardpoints = ship.hardpoints.filter((hp) => hp.weapon);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-crust">
      <TopNav showBack />

      {/* ── Mobile hero copy ─────────────────────────────────── */}
      <div className="relative z-20 md:hidden mt-16 px-4 pt-4 pb-3 text-center">
        <div className="text-10 tracking-label text-overlay1 uppercase mb-1">
          {ship.manufacturer}
        </div>
        <h1 className="font-display text-28 font-bold text-text tracking-tightx uppercase leading-none">
          {modelName}
        </h1>
        {ship.isConcept ? (
          <div className="mt-2 inline-block px-2 py-0.5 text-10 tracking-label text-peach/80 uppercase border border-peach/20 rounded-sm">
            concept
          </div>
        ) : null}
      </div>

      {/* ── Single hero media mount ──────────────────────────── */}
      <div className="relative z-0 h-[42svh] min-h-[300px] w-full overflow-hidden md:fixed md:inset-0 md:h-auto">
        {glbUrl ? (
          <ShipViewer3DWrapper glbUrl={glbUrl} className="w-full h-full" />
        ) : ship.photo ? (
          <img
            src={ship.photo}
            alt={ship.name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-[0.52]"
          />
        ) : (
          <div className="absolute inset-0 bg-crust" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(137,220,235,0.12),transparent_40%),radial-gradient(circle_at_50%_72%,rgba(203,166,247,0.10),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-crust via-crust/70 to-transparent md:h-40" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-crust via-crust/82 to-transparent md:h-64" />
      </div>

      {/* ── Hero ship name — centered Orbitron ────────────────── */}
      <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none select-none hidden md:block max-w-[700px]">
        <div className="text-11 tracking-label text-overlay1 uppercase mb-1">
          {ship.manufacturer}
        </div>
        <h1 className="font-display text-32 md:text-40 font-bold text-text/80 tracking-tightx uppercase leading-none">
          {modelName}
        </h1>
        {ship.isConcept ? (
          <div className="mt-3 inline-block px-3 py-1 text-10 tracking-label text-peach/80 uppercase border border-peach/20 rounded-sm">
            concept
          </div>
        ) : null}
      </div>

      {/* ── Desktop: floating side panels ─────────────────────── */}
      <div
        className="fixed inset-0 z-10 pointer-events-none hidden md:block"
        style={{ top: "64px" }}
      >
        {/* Left column — identity + logistics */}
        <div className="absolute left-4 top-28 bottom-16 w-[320px] flex flex-col gap-3 pointer-events-auto overflow-y-auto pr-2">
          <IdentityPanel ship={ship} />
          <LogisticsPanel ship={ship} />
        </div>

        {/* Right column — combat + where to buy + loadout */}
        <div className="absolute right-4 top-28 bottom-16 w-[320px] flex flex-col gap-3 pointer-events-auto overflow-y-auto pl-2">
          <CombatPanel ship={ship} />

          {ship.buyAt ? (
            <PanelShell as="aside" eyebrow="where to buy">
              <a
                href={shopSearchHref(ship.buyAt)}
                className="text-13 text-mauve hover:text-text transition-colors duration-180 ease-deliberate"
              >
                {ship.buyAt} ↗
              </a>
            </PanelShell>
          ) : null}

          {ship.pledgeStoreUrl ? (
            <PanelShell as="aside" eyebrow="pledge store">
              <a
                href={ship.pledgeStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="text-13 text-mauve hover:text-text transition-colors duration-180 ease-deliberate"
              >
                open RSI page ↗
              </a>
            </PanelShell>
          ) : null}

          {weaponHardpoints.length > 0 ? (
            <PanelShell as="aside" eyebrow="default loadout">
              <div className="flex flex-col gap-2">
                {weaponHardpoints.slice(0, 10).map((hp) => (
                  <a
                    key={hp.id}
                    href={`/weapons?q=${encodeURIComponent(hp.weapon ?? "")}`}
                    className="flex items-baseline gap-2 group"
                  >
                    <span className="text-10 font-mono text-overlay0 shrink-0 w-5 text-right">
                      S{hp.size}
                    </span>
                    <span className="text-11 text-subtext0 group-hover:text-mauve transition-colors duration-180 ease-deliberate truncate">
                      {hp.weapon}
                    </span>
                  </a>
                ))}
                {weaponHardpoints.length > 10 ? (
                  <span className="text-10 text-overlay0 pl-7">
                    +{weaponHardpoints.length - 10} more
                  </span>
                ) : null}
              </div>
            </PanelShell>
          ) : null}
        </div>
      </div>

      {/* ── Mobile: vertical stack ────────────────────────────── */}
      <div className="relative z-20 md:hidden pb-24 px-4 pt-4 flex flex-col gap-3">
        <IdentityPanel ship={ship} />
        <LogisticsPanel ship={ship} />
        <CombatPanel ship={ship} />

        {ship.buyAt ? (
          <PanelShell as="aside" eyebrow="where to buy">
            <a
              href={shopSearchHref(ship.buyAt)}
              className="text-13 text-mauve hover:text-text transition-colors duration-180 ease-deliberate"
            >
              {ship.buyAt} ↗
            </a>
          </PanelShell>
        ) : null}

        {ship.pledgeStoreUrl ? (
          <PanelShell as="aside" eyebrow="pledge store">
            <a
              href={ship.pledgeStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="text-13 text-mauve hover:text-text transition-colors duration-180 ease-deliberate"
            >
              open RSI page ↗
            </a>
          </PanelShell>
        ) : null}
      </div>

      {/* ── Prev / next ship ──────────────────────────────────── */}
      <div className="fixed left-1/2 -translate-x-1/2 z-30 bottom-14 hidden md:flex items-center gap-4 text-11 text-subtext0 select-none">
        {prev ? (
          <a
            href={`/ships/${prev.slug}`}
            className="hover:text-text transition-colors duration-180 ease-deliberate"
          >
            ← {extractModelName(prev.name, "").toUpperCase()}
          </a>
        ) : null}
        {prev && next ? <span className="text-overlay0">·</span> : null}
        {next ? (
          <a
            href={`/ships/${next.slug}`}
            className="hover:text-text transition-colors duration-180 ease-deliberate"
          >
            {extractModelName(next.name, "").toUpperCase()} →
          </a>
        ) : null}
      </div>

      <BottomTextNav active="hangar" rightOffset={0} className="left-1/2 -translate-x-1/2" />
    </main>
  );
}
