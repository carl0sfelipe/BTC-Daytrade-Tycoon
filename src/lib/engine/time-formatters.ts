/**
 * Pure formatting utilities for the timewarp engine.
 *
 * These functions have no side effects and depend only on their inputs.
 */

const MIN_DATE = new Date("2017-12-01T00:00:00Z").getTime();
const MAX_DATE = new Date("2025-12-31T00:00:00Z").getTime();

/**
 * Draws a random date between the fixed historical window bounds.
 *
 * @example
 * const startDate = randomDate();
 */
export function randomDate(): Date {
  const ts = MIN_DATE + Math.random() * (MAX_DATE - MIN_DATE);
  return new Date(ts);
}

/**
 * Formats a date as DD/MM/YYYY, HH:MM for display.
 */
export function formatRealDate(d: Date): string {
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats elapsed seconds as HH:MM:SS.
 */
export function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats simulated minutes as "Xd Yh Zm".
 */
export function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.floor(minutes % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}
