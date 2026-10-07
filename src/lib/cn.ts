import { clsx, type ClassValue } from "clsx";

/** Tiny className composer - conditional classes without fighting Tailwind's own conflicts
 * (we don't need full tailwind-merge here since the app's classes rarely collide). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
