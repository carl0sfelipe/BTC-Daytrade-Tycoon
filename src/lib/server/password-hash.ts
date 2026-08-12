/**
 * Password hashing built on Node's scrypt — zero external dependencies.
 * Stored format: "scrypt:<saltHex>:<derivedKeyHex>", self-contained so the
 * algorithm can be rotated later by checking the prefix.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scryptCallback);

const SCRYPT_KEY_LENGTH = 64;
const SALT_BYTES = 16;
const HASH_PREFIX = "scrypt";

/**
 * Hashes a plaintext password into a self-contained storable string.
 *
 * @example const stored = await hashPassword("hunter22!");
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `${HASH_PREFIX}:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored "scrypt:<salt>:<key>" hash.
 * Returns false instead of throwing on malformed input so login fails closed.
 *
 * @example const ok = await verifyPassword("hunter22!", user.passwordHash);
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [prefix, salt, keyHex] = storedHash.split(":");
  if (prefix !== HASH_PREFIX || !salt || !keyHex) return false;
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(keyHex, "hex");
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}
