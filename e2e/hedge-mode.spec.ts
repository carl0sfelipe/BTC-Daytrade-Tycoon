import { test, expect, type Page } from "@playwright/test";
import { saveEvidence, captureConsoleLogs } from "./_helper";
import { seedOnboardingDone, openLongMarketViaUI, closePositionViaUI } from "./_helpers/ui-actions";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

const JID = "HEDGE-MODE";

function orderControls(page: Page) {
  return page.locator(".card-surface").filter({ hasText: "Order Controls" });
}

test.describe("Reduce Only / Hedge Mode E2E", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("Reduce Only toggle appears when position is open", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page);
    await saveEvidence(page, JID, "01-no-position");

    // Toggle is NOT visible without a position
    const controls = orderControls(page);
    await expect(controls.locator("text=Position Mode")).toBeHidden();

    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 50 });
    await saveEvidence(page, JID, "02-position-opened");

    // Now the toggle shows, defaulting to Reduce Only
    await expect(controls.locator("text=Position Mode")).toBeVisible();
    await expect(controls.locator("text=Reduce Only").first()).toBeVisible();

    await closePositionViaUI(page);
    await saveLogs("toggle-visibility");
  });

  test("flip position in Hedge Mode", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    // wallet=1000 so 10% size = $1000
    await openPinnedTradingSession(page, undefined, {
      wallet: 1000,
      pendingOrders: [],
      ordersHistory: [],
      reduceOnly: true,
    });

    // LONG $1000 @ 10x (10% of 1000×10)
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });
    await saveEvidence(page, JID, "03-long-opened");

    const posPanel = page.locator(".card-surface").filter({ hasText: "Your Position" });
    await expect(posPanel.locator("text=LONG").first()).toBeVisible();

    // Enable Hedge Mode via toggle click
    const controls = orderControls(page);
    const toggleBtn = controls.locator('button[aria-label="Enable hedge mode"]').first();
    await toggleBtn.click();
    await expect(controls.locator("text=Hedge Mode").first()).toBeVisible();
    await saveEvidence(page, JID, "04-hedge-mode-enabled");

    // Execute flip via store action (slider control via Playwright is unreliable
    // with React controlled inputs; we test the UI setup and verify the flip result via UI)
    await page.evaluate(() => {
      const store = (window as E2EBridgeWindow).__tradingStore!;
      (store.getState() as {
        openPosition: (side: string, leverage: number, size: number) => void;
      }).openPosition("short", 10, 2500);
    });

    // Position flips to SHORT sized at the excess: 2500 − 1000 = 1500
    await expect(posPanel.locator("text=SHORT").first()).toBeVisible();
    await expect(posPanel.locator("text=$1,500").first()).toBeVisible();
    await saveEvidence(page, JID, "05-position-flipped");

    // The original LONG must have been realized as a closed trade
    const storeState = await page.evaluate(() => {
      const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
        closedTrades: Array<{ side: string }>;
        realizedPnL: number;
      };
      return {
        closedTradesCount: s.closedTrades.length,
        firstTradeSide: s.closedTrades[0]?.side,
      };
    });
    expect(storeState.closedTradesCount).toBe(1);
    expect(storeState.firstTradeSide).toBe("long");

    await closePositionViaUI(page);
    await saveLogs("hedge-flip");
  });

  test("opposite order in Reduce Only only reduces, never flips", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    // wallet=1000 so 10% size = $1000; slider reset = 1000 = full position
    await openPinnedTradingSession(page, undefined, { wallet: 1000, reduceOnly: true });

    // Open LONG $1000 via UI (10% of 1000×10)
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });
    await saveEvidence(page, JID, "06-long-opened");

    // In Reduce Only (default), arm the opposite side. The trade controls keep
    // side/size in React-local state, so no fullPage screenshot may run between
    // here and the reduce click — a viewport resize can remount the controls
    // and silently reset side back to 'long' (see called-shot.spec.ts notes).
    const shortTab = page.getByTestId("trade-controls-side-short");
    await shortTab.click();
    await expect(shortTab).toHaveClass(/bg-crypto-short/);

    // Slider resets to position.size ($1000), so REDUCE POSITION closes fully
    const reduceBtn = page.getByTestId("trade-controls-action-btn");
    await expect(reduceBtn).toHaveText(/REDUCE POSITION/);
    await reduceBtn.click();
    await expect(page.getByTestId("position-panel-empty")).toBeVisible();
    await saveEvidence(page, JID, "08-reduce-only-result");

    // Position closed (null), never flipped
    const storeState = await page.evaluate(() => {
      const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
        position: { side: string } | null;
        closedTrades: unknown[];
      };
      return {
        hasPosition: !!s.position,
        closedTradesCount: s.closedTrades.length,
      };
    });
    expect(storeState.hasPosition).toBe(false);
    expect(storeState.closedTradesCount).toBe(1);

    await saveLogs("reduce-only");
  });
});
