/**
 * Input validation for the called-shot endpoints.
 * targetPercent is deliberately NOT accepted from the client — the service
 * recomputes it from side/entry/target so payouts can't be inflated.
 */
import { z } from "zod";
import { firstZodIssueMessage } from "./zod-issue-message";

export const openCallInputSchema = z.object({
  runId: z.string().min(1).max(64),
  side: z.enum(["long", "short"]),
  entryPrice: z.number().finite().positive(),
  targetPrice: z.number().finite().positive(),
  leverage: z.number().finite().min(1).max(125),
});

export type OpenCallInput = z.infer<typeof openCallInputSchema>;

export const resolveCallInputSchema = z.object({
  outcome: z.enum(["hit", "missed", "voided"]),
});

export type ResolveCallInput = z.infer<typeof resolveCallInputSchema>;

export function validateOpenCallInput(body: unknown): string | null {
  const result = openCallInputSchema.safeParse(body);
  return result.success ? null : firstZodIssueMessage(result.error);
}

export function validateResolveCallInput(body: unknown): string | null {
  const result = resolveCallInputSchema.safeParse(body);
  return result.success ? null : firstZodIssueMessage(result.error);
}
