import type { ButtonHTMLAttributes, JSX } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "accent" | "outline" | "ghost";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  accent: [
    "text-mauve border border-mauve/50 bg-mauve/[0.06]",
    "hover:bg-mauve/[0.10] hover:border-mauve/70",
  ].join(" "),
  outline: [
    "text-subtext0 border border-surface0 bg-mantle/40",
    "hover:border-surface1 hover:text-text",
  ].join(" "),
  ghost: ["text-subtext0 border border-transparent", "hover:text-text hover:bg-mantle/40"].join(
    " ",
  ),
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-11 rounded-sm",
  md: "px-3 py-1.5 text-12 rounded-md",
};

export function Button({
  className,
  variant = "outline",
  size = "md",
  type = "button",
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 select-none",
        "transition-colors duration-180 ease-deliberate",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    />
  );
}
