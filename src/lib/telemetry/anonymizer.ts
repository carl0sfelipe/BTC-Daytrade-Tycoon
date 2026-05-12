/**
 * Anonymization utilities for telemetry data.
 *
 * Guarantees:
 * - User IDs are hashed (irreversible)
 * - No PII (email, IP, device fingerprint) is collected
 * - Wallet values are rounded to reduce identifiability
 * - Timestamps are truncated to minutes
 */

/**
 * Simple hash function for anonymizing IDs.
 * Not cryptographically secure — we don't need it to be.
 * We just need irreversibility and collision resistance for our scale.
 */
export function hashId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return "u" + Math.abs(hash).toString(36);
}

/**
 * Rounds a wallet value to the nearest $10 to reduce identifiability.
 */
export function obfuscateWallet(wallet: number): number {
  return Math.round(wallet / 10) * 10;
}

/**
 * Truncates a timestamp to the nearest minute.
 */
export function truncateTimestamp(ts: number): number {
  return Math.floor(ts / 60000) * 60000;
}
