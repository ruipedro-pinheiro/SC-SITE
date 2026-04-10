import type { HTMLAttributes, JSX } from "react";
import { cn } from "../../lib/cn";

export interface TextKbdProps extends HTMLAttributes<HTMLElement> {}

export function TextKbd({ className, ...props }: TextKbdProps): JSX.Element {
  return (
    <kbd
      className={cn(
        "px-1.5 py-0.5 text-10 font-mono border border-surface0 rounded-sm text-subtext0",
        className,
      )}
      {...props}
    />
  );
}
