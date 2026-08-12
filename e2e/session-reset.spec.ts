import { test, expect, type Page } from "@playwright/test";
import { saveEvidence, captureConsoleLogs } from "./_helper";
import { seedOnboardingDone } from "./_helpers/ui-actions";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

const JID = "SESSION-RESET";

function readStoreResetSnapshot(page: Page) {
  return page.evaluate(() => {
    const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
      position: unknown;
      closedTrades: unknown[];
      pendingOrders: unknown[];
      ordersHistory: unknown[];
      realizedPnL: number;
      reduceOnly: boolean;
      wallet: number;
      isLiquidated: boolean;
      simulationRealDate: string | null;
    };
    return {
      hasPosition: !!s.position,
      closedTrades: s.closedTrades.length,
      pendingOrders: s.pendingOrders.length,
      ordersHistory: s.ordersHistory.length,
      realizedPnL: s.realizedPnL,
      reduceOnly: s.reduceOnly,
      wallet: s.wallet,
      isLiquidated: s.isLiquidated,
      simulationRealDate: s.simulationRealDate,
    };
  });
}

test.describe("Session Reset Integrity", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("new session resets all trading state", async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page, undefined, {
      pendingOrders: [],
      ordersHistory: [],
      realizedPnL: 0,
      reduceOnly: true,
    });

    // Seed dirty state: an open position ($1000 @ 10x → margin $100)
    await page.evaluate(() => {
      const store = (window as E2EBridgeWindow).__tradingStore!;
      (store.getState() as {
        openPosition: (side: string, lev: number, size: number, tp: string, sl: string, limit: null) => void;
      }).openPosition("long", 10, 1000, "", "", null);
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
            position: unknown;
            wallet: number;
          };
          return { hasPosition: !!s.position, wallet: s.wallet };
        })
      )
      .toEqual({ hasPosition: true, wallet: 9_900 });
    await saveEvidence(page, JID, "01-position-opened");

    // New session: skip the transient "Starting TimeWarp" splash (it can
    // flash faster than the locator polls) and wait for the durable
    // post-conditions — clock back on screen and store fully reset.
    await page.getByRole("button", { name: "New", exact: true }).click();
    await page.waitForSelector("text=Simulation Time", { timeout: 30_000 });
    await expect.poll(() => readStoreResetSnapshot(page), { timeout: 15_000 }).toEqual({
      hasPosition: false,
      closedTrades: 0,
      pendingOrders: 0,
      ordersHistory: 0,
      realizedPnL: 0,
      reduceOnly: true,
      wallet: 10_000,
      isLiquidated: false,
      simulationRealDate: null,
    });
    await saveEvidence(page, JID, "02-after-reset");

    await saveLogs("reset");
  });

  test("new session after liquidation resets liquidated flag", async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page, undefined, {
      isLiquidated: true,
      simulationRealDate: "01/01/2020 → 02/01/2020",
      closedTrades: [
        {
          pnl: -1000,
          side: "long",
          reason: "liquidation",
          entryPrice: 50_000,
          exitPrice: 45_000,
          size: 1000,
          leverage: 10,
          margin: 100,
          entryTime: "t1",
          exitTime: "t2",
          durationSeconds: 60,
        },
      ],
    });

    // Liquidation modal shows for the injected state
    const liqModal = page.locator('.card-surface, [role="dialog"]').filter({ hasText: /liquidat/i });
    await expect(liqModal.first()).toBeVisible();
    await saveEvidence(page, JID, "03-liquidated-state");

    // New Session from the modal → flag cleared once the session reloads
    await page.getByRole("button", { name: "New Session" }).click();
    await page.waitForSelector("text=Simulation Time", { timeout: 30_000 });
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              ((window as E2EBridgeWindow).__tradingStore!.getState() as { isLiquidated: boolean })
                .isLiquidated
          ),
        { timeout: 15_000 }
      )
      .toBe(false);
    await saveEvidence(page, JID, "04-after-liquidation-reset");

    await saveLogs("liquidation-reset");
  });
});
