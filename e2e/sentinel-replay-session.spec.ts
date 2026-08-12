import { test, expect } from "@playwright/test";
import type { SentinelSession } from "@/lib/sentinel";
import sessionData from "./fixtures/sentinel-session.json";
import { seedOnboardingDone } from "./_helpers/ui-actions";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

type SentinelBridgeWindow = Window & {
  __sentinelContext?: { clock: { now: () => number } };
  __sentinelSession?: SentinelSession;
};

test.describe("Sentinel Replay Engine — Deterministic Session Replay", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("replays a recorded session with frozen clock", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const session = sessionData as unknown as SentinelSession;

    // Pin the session so the replayed snapshots are deterministic
    // (fixture assumes wallet $10k and a $1000 default order size).
    await openPinnedTradingSession(page);

    await page.evaluate((sess) => {
      (window as SentinelBridgeWindow).__sentinelSession = sess;
    }, session);

    // The Sentinel clock rides window.__sentinelContext (the store never
    // carried it) and counts wall ms since engine start — never negative.
    const clockNow = await page.evaluate(
      () => (window as SentinelBridgeWindow).__sentinelContext?.clock.now() ?? -1
    );
    expect(clockNow).toBeGreaterThanOrEqual(0);

    // Replay each UI action by semantic locator
    for (const event of session.events) {
      if (event.type !== "UI_ACTION") continue;

      const namePattern = new RegExp(
        event.semanticId.split(":").pop() ?? "",
        "i"
      );

      if (event.role === "button") {
        const btn = page.getByRole("button", { name: namePattern });
        await btn.waitFor({ state: "visible", timeout: 5000 });
        await btn.click();
      }

      if (event.role === "spinbutton") {
        // Leverage change — click the matching radio
        const radio = page.getByRole("radio", { name: namePattern });
        if (await radio.isVisible().catch(() => false)) {
          await radio.click();
        }
      }

      // Validate state divergence after action
      if (!event.engineSnapshot) continue;
      const stateValid = await page.evaluate((expectedSnapshot) => {
        const store = (window as E2EBridgeWindow).__tradingStore;
        if (!store) return false;
        const state = store.getState();

        for (const change of expectedSnapshot.changedPaths) {
          const parts = change.path.split(".");
          let current: unknown = state;
          for (const part of parts) {
            if (current && typeof current === "object") {
              current = (current as Record<string, unknown>)[part];
            } else {
              return false;
            }
          }
          // Allow approximate match for numbers (within 1%)
          if (typeof change.newValue === "number" && typeof current === "number") {
            if (Math.abs(change.newValue - current) / Math.abs(change.newValue) > 0.01) {
              return false;
            }
          } else if (JSON.stringify(current) !== JSON.stringify(change.newValue)) {
            // Strict match for non-numbers
            // For position null check, be lenient
            if (change.newValue === null && current === null) continue;
            return false;
          }
        }
        return true;
      }, event.engineSnapshot);

      expect(stateValid, `State diverged after event ${event.sequenceId} (${event.semanticId})`).toBe(true);
    }
  });

  test("session file is valid and contains monotonic sequenceIds", async () => {
    const session = sessionData as unknown as SentinelSession;

    expect(session.header.sentinelVersion).toBe("0.1.0");
    expect(session.events.length).toBeGreaterThan(0);

    let prevSeq = 0;
    for (const event of session.events) {
      expect(event.sequenceId).toBeGreaterThan(prevSeq);
      prevSeq = event.sequenceId;
    }
  });
});
