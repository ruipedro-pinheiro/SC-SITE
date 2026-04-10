// Barrel re-exports for the @sc-site/ui workspace package.
//
// Pages in apps/web import shared components from `@sc-site/ui` so any
// edit here propagates instantly via Next's HMR.

export { Badge } from "./components/ui/badge";
export { Button } from "./components/ui/button";
export { DrawerShell } from "./components/ui/drawer-shell";
export { Input } from "./components/ui/input";
export { PanelShell } from "./components/ui/panel-shell";
export { Separator } from "./components/ui/separator";
export { StatRow } from "./components/ui/stat-row";
export { TextKbd } from "./components/ui/text-kbd";

export { BottomTextNav } from "./sc/BottomTextNav";
export { CombatPanel } from "./sc/CombatPanel";
export { DamageResistanceStrip } from "./sc/DamageResistanceStrip";
export {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
  type DataTableProps,
} from "./sc/DataTable";
export {
  FilterBar,
  type FilterGroup,
  type FilterOption,
  type FilterBarProps,
} from "./sc/FilterBar";
export { HangarManifest } from "./sc/HangarManifest";
export { HistoryDrawer } from "./sc/HistoryDrawer";
export { IdentityPanel } from "./sc/IdentityPanel";
export { LogisticsPanel } from "./sc/LogisticsPanel";
export { PageShell, type PageId, type PageShellProps } from "./sc/PageShell";
export { PanelHairline } from "./sc/PanelHairline";
export { QueryRail, type QueryChip } from "./sc/QueryRail";
export { ShipCard } from "./sc/ShipCard";
export { ShipHero } from "./sc/ShipHero";
export { SourceChip, type QuerySource } from "./sc/SourceChip";
export { ThreeCanvasPlaceholder } from "./sc/ThreeCanvasPlaceholder";
export { TopNav } from "./sc/TopNav";

export type {
  Commodity,
  CommodityPrice,
  DamageResistance,
  DamageResistanceRow,
  Hardpoint,
  HardpointMountKind,
  HistoryEntry,
  Item,
  ItemType,
  Location,
  LocationType,
  Ship,
  ShipSize,
  Shop,
  ShopInventoryEntry,
} from "./sc/types";

export { cn } from "./lib/cn";
