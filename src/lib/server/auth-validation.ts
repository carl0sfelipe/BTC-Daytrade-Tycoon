/**
 * Input validation for the auth API routes (zod-backed).
 * validateXxx functions follow the project convention: return the first
 * human-readable error message, or null when the input is valid.
 */
import { z } from "zod";

export const signupInputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and _"),
  email: z.string().trim().email("Please enter a valid email").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  // Guest balance migrated at signup; the service clamps it server-side
  // (see guest-diamond-migration.ts), validation only rejects malformed shapes.
  guestDiamonds: z
    .number()
    .int("guestDiamonds must be an integer (whole diamond count)")
    .min(0, "guestDiamonds must be >= 0")
    .optional(),
});

export const loginInputSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;

function firstIssueMessage(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid input";
}

/**
 * Validates a signup payload.
 *
 * @example const error = validateSignupInput(body); // "Password must be…" | null
 */
export function validateSignupInput(input: unknown): string | null {
  return firstIssueMessage(signupInputSchema.safeParse(input));
}

/**
 * Validates a login payload.
 *
 * @example const error = validateLoginInput(body); // "Please enter…" | null
 */
export function validateLoginInput(input: unknown): string | null {
  return firstIssueMessage(loginInputSchema.safeParse(input));
}
