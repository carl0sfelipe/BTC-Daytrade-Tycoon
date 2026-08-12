/**
 * Formats the first issue of a zod failure as "path: message" so 400 bodies
 * name the offending field. Shared by the *-validation modules.
 *
 * @example return result.success ? null : firstZodIssueMessage(result.error);
 */
import type { z } from "zod";

export function firstZodIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
