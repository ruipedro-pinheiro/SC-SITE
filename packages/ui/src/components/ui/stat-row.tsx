import type { JSX, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface StatRowProps {
  label: ReactNode;
  value: ReactNode;
  source?: ReactNode;
  className?: string;
  valueClassName?: string;
}

export function StatRow({
  label,
  value,
  source,
  className,
  valueClassName,
}: StatRowProps): JSX.Element {
  return (
    <div className={cn("row", className)}>
      <span className="k">{label}</span>
      <span className={cn("v", valueClassName)}>{value}</span>
      {source ? <span className="src">{source}</span> : null}
    </div>
  );
}
