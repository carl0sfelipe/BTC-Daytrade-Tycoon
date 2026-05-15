/**
 * Generates a unique identifier.
 *
 * Uses crypto.randomUUID when available, falling back to a
 * Math.random + timestamp combination for environments without it.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return (
    Math.random().toString(36).slice(2, 9) +
    Date.now().toString(36).slice(-4)
  );
}

/**
 * Formats the current date/time in a consistent locale string.
 *
 * Used across the trading store for order timestamps and trade records.
 *
 * @example
 * formatTimestamp() // => "05/11/2026, 02:30:45 PM"
 */
export function formatTimestamp(): string {
  return new Date().toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
