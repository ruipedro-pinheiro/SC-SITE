import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely.
 * Re-exported from `@sc-site/ui/lib/cn` so consumers don't need to
 * install clsx + tailwind-merge in every package.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
