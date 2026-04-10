import type { HTMLAttributes, JSX, ReactNode } from "react";
import { cn } from "../../lib/cn";

type PanelShellElement = "div" | "aside" | "section";

export interface PanelShellProps extends HTMLAttributes<HTMLDivElement> {
  as?: PanelShellElement;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
}

export function PanelShell({
  as = "div",
  className,
  title,
  eyebrow,
  children,
  ...props
}: PanelShellProps): JSX.Element {
  const Component = as;
  return (
    <Component className={cn("panel", className)} {...props}>
      {eyebrow ? (
        <div className="text-10 tracking-micro text-overlay0 uppercase mb-4">{eyebrow}</div>
      ) : null}
      {title ? <div className="text-13 text-subtext1 mb-4">{title}</div> : null}
      {children}
    </Component>
  );
}
