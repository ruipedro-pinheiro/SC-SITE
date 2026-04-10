import type { InputHTMLAttributes, JSX } from "react";
import { cn } from "../../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps): JSX.Element {
  return (
    <input
      className={cn(
        "w-full bg-mantle/70 backdrop-blur-md border border-surface0 rounded-md",
        "px-5 py-3 text-14 text-text placeholder:text-overlay0",
        "focus:border-surface1 focus:bg-mantle/90",
        "transition-colors duration-180 ease-deliberate",
        className,
      )}
      {...props}
    />
  );
}
