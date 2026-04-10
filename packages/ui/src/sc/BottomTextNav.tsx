import type { JSX } from "react";
import { cn } from "../lib/cn";

interface BottomTextNavProps {
  active?: "hangar" | "map" | "trade" | "mining" | "weapons" | "components" | "shops";
  /** Right-edge offset in pixels. Detail pages need to clear the history drawer. */
  rightOffset?: number;
  className?: string;
}

const LINKS = [
  { key: "hangar", href: "/ships", label: "hangar" },
  { key: "weapons", href: "/weapons", label: "weapons" },
  { key: "components", href: "/components", label: "components" },
  { key: "trade", href: "/trade", label: "trade" },
  { key: "shops", href: "/shops", label: "shops" },
  { key: "mining", href: "/mining", label: "mining" },
  { key: "map", href: "/map", label: "map" },
] as const;

/**
 * The entire navigation surface (MOCKUP.md §6: "the bottom-right text-link
 * strip is the entire menu").
 *
 * Six text links, 12 px subtext0, no underlines, hover → text. The active
 * link gets the mauve accent. On detail pages the strip slides left by
 * `rightOffset` so it clears the history drawer flush against the right edge.
 */
export function BottomTextNav({
  active = "hangar",
  rightOffset = 40,
  className,
}: BottomTextNavProps): JSX.Element {
  return (
    <nav
      className={cn(
        "fixed bottom-8 z-30 flex items-center gap-5 text-12 text-subtext0 select-none",
        className,
      )}
      style={rightOffset > 0 ? { right: `${rightOffset}px` } : undefined}
    >
      {LINKS.map((link) => (
        <a
          key={link.key}
          href={link.href}
          className={cn(
            link.key === active
              ? "text-mauve"
              : "hover:text-text transition-colors duration-180 ease-deliberate",
          )}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
