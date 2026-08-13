import { test, expect, type Page } from "@playwright/test";
import { saveEvidence, captureConsoleLogs } from "./_helper";
import { openLongMarketViaUI, seedOnboardingDone } from "./_helpers/ui-actions";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

const JID = "TRAILING-STOP";

/**
 * Trailing-stop UI restored after refactor 3193d78 dropped it: the control
 * lives in trade-controls/TrailingStopControl (testids trailing-stop-input /
 * trailing-stop-set / trailing-stop-remove). These flows exercise the full
 * loop — arm via UI, stop ratchets as price rises, retracement closes.
 */

interface TrailingStoreShape {
  checkPosition: (price: number) => void;
  position: {
    trailingStopPercent: number | null;
    trailingStopPrice: number | null;
  } | null;
  closedTrades: { reason?: string }[];
}

function readTrailingStopState(page: Page) {
  return page.evaluate(() => {
    const s = (window as E2EBridgeWindow).__tradingStore!.getState() as unknown as TrailingStoreShape;
    return {
      percent: s.position?.trailingStopPercent ?? null,
      price: s.position?.trailingStopPrice ?? null,
    };
  });
}

test.describe("Trailing Stop-Loss E2E", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("trailing stop closes long position when price retraces", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page);
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });
    await saveEvidence(page, JID, "01-long-opened");

    // Arm a 5% trailing stop via the restored UI (pinned 50k → stop 47500)
    await page.getByTestId("trailing-stop-input").fill("5");
    const setButton = page.getByTestId("trailing-stop-set");
    await expect(setButton).toBeEnabled();
    await setButton.click();

    const posPanel = page.locator(".card-surface").filter({ hasText: "Your Position" });
    await expect(posPanel.getByText("Trailing Stop")).toBeVisible();
    await expect.poll(() => readTrailingStopState(page)).toEqual({ percent: 5, price: 47_500 });
    await saveEvidence(page, JID, "02-trailing-set");

    // Price up 10% — the stop must ratchet up (~52250). setState +
    // checkPosition + readback run in ONE evaluate so a StrictMode-survivor
    // tick cannot interleave (see the pauseAutoStartedEngine caveat).
    const stopAfterRise = await page.evaluate(() => {
      const store = (window as E2EBridgeWindow).__tradingStore!;
      store.setState({ currentPrice: 55_000, price: 55_000 });
      (store.getState() as unknown as TrailingStoreShape).checkPosition(55_000);
      const s = store.getState() as unknown as TrailingStoreShape;
      return s.position?.trailingStopPrice ?? null;
    });
    expect(stopAfterRise).toBeGreaterThan(47_500);
    await saveEvidence(page, JID, "03-price-up");

    // Retrace below the ratcheted stop → position closes as trailing_stop
    const afterRetrace = await page.evaluate(() => {
      const store = (window as E2EBridgeWindow).__tradingStore!;
      store.setState({ currentPrice: 52_000, price: 52_000 });
      (store.getState() as unknown as TrailingStoreShape).checkPosition(52_000);
      const s = store.getState() as unknown as TrailingStoreShape;
      return {
        hasPosition: !!s.position,
        closedTradesCount: s.closedTrades.length,
        lastReason: s.closedTrades[0]?.reason,
      };
    });
    expect(afterRetrace).toEqual({
      hasPosition: false,
      closedTradesCount: 1,
      lastReason: "trailing_stop",
    });

    await expect(page.getByTestId("position-panel-empty")).toBeVisible();
    await saveEvidence(page, JID, "04-trailing-hit");

    await saveLogs("trailing-stop-long");
  });

  test("remove trailing stop clears it from position", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");

    await openPinnedTradingSession(page);
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });

    await page.getByTestId("trailing-stop-input").fill("3");
    await page.getByTestId("trailing-stop-set").click();
    await expect.poll(() => readTrailingStopState(page)).toEqual({ percent: 3, price: 48_500 });

    await page.getByTestId("trailing-stop-remove").click();
    await expect.poll(() => readTrailingStopState(page)).toEqual({ percent: null, price: null });
    await expect(page.getByTestId("trailing-stop-input")).toHaveValue("");
  });
});
