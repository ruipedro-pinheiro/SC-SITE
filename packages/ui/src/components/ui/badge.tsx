import type { HTMLAttributes, JSX } from "react";
import { cn } from "../../lib/cn";

type BadgeVariant = "accent" | "muted" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  accent: "text-mauve border border-mauve/50 bg-mauve/[0.06]",
  muted: "text-overlay0 border border-surface0 bg-mantle/40",
  outline: "text-subtext0 border border-surface0",
};

export function Badge({ className, variant = "outline", ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-12",
        "transition-colors duration-180 ease-deliberate",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  );
}
