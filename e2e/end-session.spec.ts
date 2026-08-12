import { test, expect, type Page } from "@playwright/test";
import { saveEvidence, captureConsoleLogs } from "./_helper";
import { seedOnboardingDone } from "./_helpers/ui-actions";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

const JID = "END-SESSION";

function readSessionResetSnapshot(page: Page) {
  return page.evaluate(() => {
    const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
      position: unknown;
      closedTrades: unknown[];
      isLiquidated: boolean;
      simulationRealDate: string | null;
      realizedPnL: number;
      wallet: number;
    };
    return {
      hasPosition: !!s.position,
      closedTrades: s.closedTrades.length,
      isLiquidated: s.isLiquidated,
      simulationRealDate: s.simulationRealDate,
      realizedPnL: s.realizedPnL,
      wallet: s.wallet,
    };
  });
}

test.describe("End Session with Open Position", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("ending session shows modal with P&L and new session resets state", async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    // Session with one realized trade (+$40)
    await openPinnedTradingSession(page, 52_000, {
      wallet: 10_040,
      closedTrades: [
        {
          pnl: 40,
          side: "long",
          reason: "manual",
          entryPrice: 50_000,
          exitPrice: 52_000,
          size: 1000,
          leverage: 10,
          margin: 100,
          entryTime: "t1",
          exitTime: "t2",
          durationSeconds: 300,
        },
      ],
      simulationRealDate: "01/01/2020 → 02/01/2020",
    });
    await saveEvidence(page, JID, "01-seeded-state");

    // End the session → modal with the session stats
    await page.getByRole("button", { name: "End", exact: true }).click();
    await expect(page.locator("text=Simulation Ended").first()).toBeVisible();
    await expect(page.locator("text=Session Return").first()).toBeVisible();
    await expect(page.locator("text=Real Historical Period").first()).toBeVisible();
    await saveEvidence(page, JID, "02-end-modal");

    // "New Session" first opens the difficulty selector; the store only
    // resets after "Start Session" confirms it (handleDifficultyConfirm →
    // engine.reset). Default difficulty keeps the $10k wallet.
    await page.getByRole("button", { name: "New Session" }).click();
    await expect(page.getByRole("dialog", { name: "Select Difficulty" })).toBeVisible();
    await page.getByRole("button", { name: "Start Session" }).click();

    // Don't wait for the transient "Starting TimeWarp" splash (it can flash
    // faster than the locator polls) — wait for the durable post-conditions:
    // the clock is back and the store was reset.
    await page.waitForSelector("text=Simulation Time", { timeout: 30_000 });
    await expect.poll(() => readSessionResetSnapshot(page), { timeout: 15_000 }).toEqual({
      hasPosition: false,
      closedTrades: 0,
      isLiquidated: false,
      simulationRealDate: null,
      realizedPnL: 0,
      wallet: 10_000,
    });
    await saveEvidence(page, JID, "03-new-session");

    await saveLogs("end-session");
  });
});
