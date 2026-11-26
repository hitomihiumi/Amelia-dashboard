import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Marks a promise as handled so it can be started early and awaited later without an
 * unhandled rejection while other work is still in flight. Awaiting it still throws.
 */
export function early<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);
  return promise;
}
