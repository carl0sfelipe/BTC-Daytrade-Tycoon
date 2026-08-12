import { test, expect, type Page } from "@playwright/test";
import { saveEvidence, captureConsoleLogs } from "./_helper";
import { seedOnboardingDone, openLongMarketViaUI, closePositionViaUI } from "./_helpers/ui-actions";
import { FLAT_PRICE } from "./_helpers/mock-binance";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

const JID = "LIMIT-ORDERS";

/** Switch the order-type toggle to Limit and wait for the price input. */
async function switchToLimitOrders(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Limit", exact: true }).click();
  await expect(page.getByTestId("limit-price-input")).toBeVisible();
}

function readPendingOrdersCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const state = (window as E2EBridgeWindow).__tradingStore!.getState() as {
      pendingOrders: unknown[];
    };
    return state.pendingOrders.length;
  });
}

/** Force the price and run the pending-order matcher (engine is paused). */
async function driveLimitPriceHit(page: Page, price: number): Promise<void> {
  await page.evaluate((p) => {
    const store = (window as E2EBridgeWindow).__tradingStore!;
    store.setState({ currentPrice: p, price: p });
    (store.getState() as { checkPendingOrders: (price: number) => void }).checkPendingOrders(p);
  }, price);
}

test.describe("Limit Orders E2E", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("create and cancel a limit order", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page);
    await switchToLimitOrders(page);

    // Long limit 2% below the pinned price → stays pending
    await page.getByTestId("limit-price-input").fill((FLAT_PRICE * 0.98).toFixed(2));
    const sizePill = page.getByRole("radio", { name: "25% position size" });
    await sizePill.click();
    await expect(sizePill).toBeChecked();

    await page.getByRole("button", { name: "Place Long Limit" }).click();
    await expect.poll(() => readPendingOrdersCount(page)).toBe(1);
    await expect(page.getByTestId("orders-panel-filter-pending")).toHaveText("Pending (1)");
    await saveEvidence(page, JID, "02-limit-order-placed");

    // Cancel it from the Orders panel
    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect.poll(() => readPendingOrdersCount(page)).toBe(0);
    await expect(page.getByTestId("orders-panel-filter-canceled")).toHaveText("Canceled (1)");
    await saveEvidence(page, JID, "03-order-cancelled");

    await saveLogs("create-cancel");
  });

  test("limit order executes when price hits", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page);
    await switchToLimitOrders(page);

    // Long limit 1% ABOVE the pinned price → pending until price rises to it
    const limitPrice = FLAT_PRICE * 1.01;
    await page.getByTestId("limit-price-input").fill(limitPrice.toFixed(2));
    const sizePill = page.getByRole("radio", { name: "50% position size" });
    await sizePill.click();
    await expect(sizePill).toBeChecked();

    await page.getByRole("button", { name: "Place Long Limit" }).click();
    await expect.poll(() => readPendingOrdersCount(page)).toBe(1);
    await expect(page.getByTestId("orders-panel-filter-pending")).toHaveText("Pending (1)");
    await saveEvidence(page, JID, "04-limit-above-price");

    await driveLimitPriceHit(page, limitPrice);
    await expect(page.getByTestId("position-panel-pnl")).toBeVisible();
    await expect(page.getByTestId("orders-panel-filter-filled")).toHaveText("Filled (1)");
    await saveEvidence(page, JID, "06-limit-executed");

    await closePositionViaUI(page);
    await saveLogs("limit-execution");
  });

  test("limit order on opposite side reduces existing position", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page);

    // LONG $50k (10x, 50% of $10k wallet) at the pinned price
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 50 });

    // Opposite-side (SHORT) limit for $500 — in Reduce Only it must only
    // shrink the long, never flip it.
    await switchToLimitOrders(page);
    const shortTab = page.getByTestId("trade-controls-side-short");
    await shortTab.click();
    await expect(shortTab).toHaveClass(/bg-crypto-short/);

    await page.getByTestId("limit-price-input").fill("51000");
    const sizeSlider = page.getByTestId("trade-controls-size-slider");
    await sizeSlider.fill("500");
    await expect(sizeSlider).toHaveValue("500");

    await page.getByRole("button", { name: "Place Short Limit" }).click();
    await expect.poll(() => readPendingOrdersCount(page)).toBe(1);
    await saveEvidence(page, JID, "07-reduce-limit-placed");

    await driveLimitPriceHit(page, 51_000);

    // Position survives, reduced exactly by the limit size: 50000 − 500
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = (window as E2EBridgeWindow).__tradingStore!.getState() as {
            position: { size: number; side: string } | null;
          };
          return state.position && { size: state.position.size, side: state.position.side };
        })
      )
      .toEqual({ size: 49_500, side: "long" });
    await saveEvidence(page, JID, "08-reduce-limit-executed");

    await closePositionViaUI(page);
    await saveLogs("limit-reduce");
  });
});
