import type { HTMLAttributes, JSX } from "react";
import { cn } from "../../lib/cn";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        orientation === "horizontal" ? "h-px w-full bg-surface0" : "w-px self-stretch bg-surface0",
        className,
      )}
      {...props}
    />
  );
}
