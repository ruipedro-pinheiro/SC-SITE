import type { JSX, ReactNode } from "react";
import { cn } from "../lib/cn";
import { BottomTextNav } from "./BottomTextNav";
import { ThreeCanvasPlaceholder } from "./ThreeCanvasPlaceholder";
import { TopNav } from "./TopNav";

export type PageId = "hangar" | "map" | "trade" | "mining" | "weapons" | "components" | "shops";

export interface PageShellProps {
  /** Page title displayed top-centre. */
  title: string;
  /** Optional subtitle (e.g. item count). */
  subtitle?: string | undefined;
  /** Active nav link key. */
  active: PageId;
  /** Content rendered below the title area. */
  children: ReactNode;
  className?: string | undefined;
}

/**
 * Common page wrapper for catalog list pages (weapons, components, trade,
 * shops, mining, map). Renders the ThreeCanvasPlaceholder backdrop, TopNav
 * with back link, a centered content panel, and the BottomTextNav.
 *
 * Each page passes its active nav key and title; the shell handles the
 * consistent chrome so pages only worry about their data table content.
 */
export function PageShell({
  title,
  subtitle,
  active,
  children,
  className,
}: PageShellProps): JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <ThreeCanvasPlaceholder label={`${title} — three.js mount point`} />
      <TopNav
        showBack
        centerLabel={title.toUpperCase()}
        {...(subtitle ? { centerSub: subtitle } : {})}
      />

      <div className={cn("relative z-20 mx-auto mt-24 pb-20 px-6", "max-w-6xl", className)}>
        <div className="panel p-6">{children}</div>
      </div>

      <BottomTextNav active={active} />
    </main>
  );
}
