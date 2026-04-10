import type { HTMLAttributes, JSX, ReactNode } from "react";
import { cn } from "../../lib/cn";

type DrawerShellElement = "div" | "aside" | "section";

export interface DrawerShellProps extends HTMLAttributes<HTMLDivElement> {
  as?: DrawerShellElement;
  children: ReactNode;
}

export function DrawerShell({
  as = "div",
  className,
  children,
  style,
  ...props
}: DrawerShellProps): JSX.Element {
  const Component = as;
  return (
    <Component
      className={cn("panel", className)}
      style={{
        borderRight: "none",
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
