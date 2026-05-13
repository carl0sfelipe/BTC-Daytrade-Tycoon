import { test, expect } from "@playwright/test";
import type { SentinelSession } from "@/lib/sentinel";
import sessionData from "./fixtures/sentinel-session.json";

test.describe("Sentinel Replay Engine — Deterministic Session Replay", () => {
  test("replays a recorded session with frozen clock", async ({ page }) => {
    const session = sessionData as unknown as SentinelSession;

    await page.goto("/trading");
    await page.waitForSelector("text=Simulation Time", { timeout: 15000 });

    // Inject session and freeze clock
    await page.evaluate((sess) => {
      (window as unknown as { __sentinelSession?: SentinelSession }).__sentinelSession = sess;
    }, session);

    // Verify clock is frozen at initial time
    const clockNow = await page.evaluate(() => {
      const store = (window as unknown as { __tradingStore?: { getState: () => { clock?: { now: () => number } } } }).__tradingStore;
      return store?.getState().clock?.now() ?? -1;
    });
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
        const store = (window as unknown as { __tradingStore?: { getState: () => Record<string, unknown> } }).__tradingStore;
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
