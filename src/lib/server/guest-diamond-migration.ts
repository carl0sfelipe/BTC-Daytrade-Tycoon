/**
 * Guest-to-account diamond migration policy (Boss decision, 2026-08-12).
 *
 * Study-backed choice: wiping guest diamonds at signup punishes the exact
 * action we want to reward (loss aversion — losses weigh ~2x gains; the
 * endowment effect makes the guest balance feel owned). Instead we migrate
 * the balance and frame signup as "securing your loot" (peak-end rule).
 *
 * The balance is client-reported and therefore untrusted: the cap keeps a
 * tampered payload from injecting more than one run's worth of diamonds.
 * Migration happens only at signup — login always restores the server
 * balance, which is authoritative (party 2026-08-12, Winston).
 */
import { MAX_DIAMONDS_PER_RUN } from "@/lib/calls/diamond-reward";

export const GUEST_DIAMOND_MIGRATION_CAP = MAX_DIAMONDS_PER_RUN;

/**
 * Clamps a client-reported guest balance into the range the server accepts.
 *
 * @example clampGuestDiamondMigration(9_999) // 150 (one-run cap)
 */
export function clampGuestDiamondMigration(guestDiamonds: number | undefined): number {
  if (guestDiamonds === undefined || !Number.isFinite(guestDiamonds)) return 0;
  return Math.min(Math.max(0, Math.floor(guestDiamonds)), GUEST_DIAMOND_MIGRATION_CAP);
}
