/**
 * Input validation for POST /api/missions/claim. Only the mission id crosses
 * the boundary — progress and reward are recomputed server-side
 * (mission-service), never trusted from the client.
 */
import { z } from "zod";
import { firstZodIssueMessage } from "./zod-issue-message";

export const missionClaimInputSchema = z.object({
  missionId: z.string().min(1).max(64),
});

export type MissionClaimInput = z.infer<typeof missionClaimInputSchema>;

/**
 * Validates a mission claim payload.
 *
 * @example const error = validateMissionClaimInput(body); // string | null
 */
export function validateMissionClaimInput(body: unknown): string | null {
  const result = missionClaimInputSchema.safeParse(body);
  return result.success ? null : firstZodIssueMessage(result.error);
}
