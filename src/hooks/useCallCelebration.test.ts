import { describe, expect, it } from "vitest";
import { makeResolvedCallHit } from "@/test/helpers";
import { enGameMessages } from "@/lib/i18n/messages/en";
import { ptBrGameMessages } from "@/lib/i18n/messages/pt-br";
import { buildCallResolutionToast } from "./useCallCelebration";

describe("buildCallResolutionToast", () => {
  it("celebrates a first rewarded hit without a streak mention", () => {
    const toast = buildCallResolutionToast(
      makeResolvedCallHit({ reward: 14, streak: 1 }),
      enGameMessages
    );
    expect(toast.title).toBe("💎 CALLED SHOT! +14");
    expect(toast.description).toBe("Prediction nailed — diamonds banked");
    expect(toast.variant).toBeUndefined();
  });

  it("mentions the streak from the second consecutive hit", () => {
    const toast = buildCallResolutionToast(
      makeResolvedCallHit({ reward: 20, streak: 3 }),
      enGameMessages
    );
    expect(toast.description).toBe("Streak ×3 — next hit pays more");
  });

  it("explains a zero-reward hit instead of celebrating", () => {
    const toast = buildCallResolutionToast(makeResolvedCallHit({ reward: 0 }), enGameMessages);
    expect(toast.title).toBe("🎯 Called shot hit");
    expect(toast.description).toBe("No payout — reward cooldown or run cap reached");
  });

  it("marks a miss as destructive", () => {
    const toast = buildCallResolutionToast(
      makeResolvedCallHit({ outcome: "missed", reward: 0 }),
      enGameMessages
    );
    expect(toast.title).toBe("🎯 Called shot missed");
    expect(toast.variant).toBe("destructive");
  });

  it("keeps the streak reassurance on a void", () => {
    const toast = buildCallResolutionToast(
      makeResolvedCallHit({ outcome: "voided", reward: 0 }),
      enGameMessages
    );
    expect(toast.title).toBe("🎯 Called shot voided");
    expect(toast.description).toBe("Exited early or moved the TP — no payout, streak kept");
  });

  it("localizes the celebration in pt-BR", () => {
    const toast = buildCallResolutionToast(
      makeResolvedCallHit({ reward: 14, streak: 1 }),
      ptBrGameMessages
    );
    expect(toast.title).toBe("💎 CALLED SHOT! +14");
    expect(toast.description).toBe("Previsão cravada — diamantes garantidos");
  });
});
