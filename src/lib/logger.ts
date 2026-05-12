/**
 * Structured logger for the BTC Daytrade Tycoon application.
 *
 * In production, all log calls are no-ops (tree-shaken by bundler).
 * In development, logs go to the browser console with prefixes.
 *
 * @example
 * import { logger } from "@/lib/logger";
 * logger.log("[openPosition]", { side: "long", size: 1000 });
 * logger.error("[tick] simulation error", err);
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
};
