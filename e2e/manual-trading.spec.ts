import { test, expect, type Page } from "@playwright/test";
import { seedOnboardingDone, openLongMarketViaUI } from "./_helpers/ui-actions";
import { FLAT_PRICE } from "./_helpers/mock-binance";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

/**
 * Manual trading flows against a pinned market (FLAT_PRICE, wallet $10k).
 * All numbers below are exact because the Binance mock keeps every tick at
 * FLAT_PRICE and the engine is paused before any order is placed.
 *
 * Cross-margin model (calcLiquidationPrice): LONG 10x, size $50k, margin $5k,
 * free wallet $5k → liq = 50000 × (1 − 10000/50000) = $40,000, so the initial
 * distance to liquidation is exactly 20% and the risk bar starts at 0%
 * (distance > maxDistance = 100/leverage = 10%).
 */

const WALLET = 10_000;
const OPEN_SIZE_50PCT = 50_000; // floor(10000 × 10 × 0.5)
const INCREASE_SIZE = 37_500; // 75% of the post-open $50k slider capacity
const REDUCE_SIZE = 20_000;
const INITIAL_DISTANCE_PCT = 20.0;

async function openLong10xFiftyPercent(page: Page): Promise<void> {
  await openLongMarketViaUI(page, { leverage: 10, sizePercent: 50 });
}

function positionPanel(page: Page) {
  return page.locator(".card-surface").filter({ hasText: "Your Position" });
}

function readStorePositionSize(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const state = (window as E2EBridgeWindow).__tradingStore!.getState() as {
      position: { size: number } | null;
    };
    return state.position?.size ?? null;
  });
}

function readStoreWallet(page: Page): Promise<number> {
  return page.evaluate(
    () => ((window as E2EBridgeWindow).__tradingStore!.getState() as { wallet: number }).wallet
  );
}

/** Pin a new market price on the paused engine (no candle tick involved). */
async function forceMarketPrice(page: Page, price: number): Promise<void> {
  await page.evaluate((p) => {
    (window as E2EBridgeWindow).__tradingStore!.setState({ currentPrice: p, price: p });
  }, price);
}

/** Inline style width of the risk bar, in percent (transition-safe). */
function readDistanceBarWidth(page: Page): Promise<number> {
  return page
    .getByTestId("distance-bar")
    .evaluate((el: HTMLElement) => parseFloat(el.style.width));
}

/**
 * Self-correcting risk-bar read for forced (off-mock) prices: a StrictMode
 * revival of the tick loop can rewrite the store back to FLAT_PRICE at any
 * moment (see pauseAutoStartedEngine docstring), so every poll iteration
 * re-pins the forced price BEFORE reading the bar — a surviving tick can only
 * delay convergence by one iteration, never flake the assertion.
 */
function pollDistanceBarAtForcedPrice(page: Page, price: number) {
  return expect.poll(async () => {
    await forceMarketPrice(page, price);
    return readDistanceBarWidth(page);
  });
}

test.describe("Manual Trading Validation", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    await seedOnboardingDone(page);
    await openPinnedTradingSession(page);
  });

  test("full position lifecycle", async ({ page }) => {
    await page.screenshot({ path: "test-results/01-initial.png", fullPage: true });

    // Step 1: open LONG 10x with 50% size
    await openLong10xFiftyPercent(page);
    await page.screenshot({ path: "test-results/02-position-opened.png", fullPage: true });
    await expect(positionPanel(page).locator("text=Close Position").first()).toBeVisible();

    // Step 2: increase — capacity is exactly $50k (free wallet $5k × 10x, flat PnL)
    const slider = page.getByTestId("trade-controls-size-slider");
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute("max", String(OPEN_SIZE_50PCT));

    await slider.fill(String(INCREASE_SIZE));
    await expect(slider).toHaveValue(String(INCREASE_SIZE));
    await page.screenshot({ path: "test-results/03-slider-increase.png", fullPage: true });

    const actionBtn = page.getByTestId("trade-controls-action-btn");
    await expect(actionBtn).toHaveText(/INCREASE POSITION/i);
    await expect(actionBtn).toBeEnabled();
    await actionBtn.click();
    await expect.poll(() => readStorePositionSize(page)).toBe(OPEN_SIZE_50PCT + INCREASE_SIZE);
    await expect(page.getByText(`Current: $${(87_500).toLocaleString("en-US")}`)).toBeVisible();
    await page.screenshot({ path: "test-results/04-after-increase.png", fullPage: true });

    // Step 3: reduce — SHORT tab enters reduce mode (reduceOnly defaults to true)
    await page.getByTestId("trade-controls-side-short").click();
    await expect(slider).toHaveValue("1000"); // side change resets the order size
    await slider.fill(String(REDUCE_SIZE));
    await expect(slider).toHaveValue(String(REDUCE_SIZE));

    await expect(actionBtn).toHaveText(/REDUCE POSITION/i);
    await expect(actionBtn).toBeEnabled();
    await actionBtn.click();
    await expect.poll(() => readStorePositionSize(page)).toBe(
      OPEN_SIZE_50PCT + INCREASE_SIZE - REDUCE_SIZE
    );
    await page.screenshot({ path: "test-results/05-after-reduce.png", fullPage: true });

    // Step 4: close via PositionPanel — margin returns, PnL is 0 on a flat market
    await positionPanel(page).locator("text=Close Position").first().click();
    await expect(page.getByTestId("position-panel-empty")).toBeVisible();
    await expect.poll(() => readStoreWallet(page)).toBeCloseTo(WALLET, 2);
    await page.screenshot({ path: "test-results/06-after-close.png", fullPage: true });

    // Controls return to the no-position state
    await page.getByTestId("trade-controls-side-long").click();
    await expect(page.getByTestId("trade-controls-action-btn")).toHaveText("Open Long");
  });

  test("simple mode 100% size pill respects leverage", async ({ page }) => {
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 100 });

    // Wallet $10k at 10x → $100,000 position and $10,000 margin.
    // Size renders localized ($100,000); margin renders toFixed(2) with no
    // thousands separator ($10000.00) — see PositionDetails.tsx.
    const panelText = await positionPanel(page).innerText();
    expect(panelText).toContain("$100,000");
    expect(panelText).toContain("$10000.00");

    await positionPanel(page).locator("text=Close Position").first().click();
    await expect(page.getByTestId("position-panel-empty")).toBeVisible();
  });

  test("distance to liquidation displays correctly", async ({ page }) => {
    await openLong10xFiftyPercent(page);
    await page.screenshot({ path: "test-results/08-distance-to-liq.png", fullPage: true });

    const panelText = await positionPanel(page).innerText();
    expect(panelText).toContain("DISTANCE TO LIQUIDATION");

    // Cross-margin: liq at $40k → distance exactly 20.0% at the pinned entry
    const match = panelText.match(/DISTANCE TO LIQUIDATION\s*\n?\s*([\d.]+)%/);
    const pct = match ? parseFloat(match[1]) : -1;
    expect(pct).toBeCloseTo(INITIAL_DISTANCE_PCT, 1);

    await expect(page.getByTestId("distance-bar")).toBeVisible();

    await positionPanel(page).locator("text=Close Position").first().click();
    await expect(page.getByTestId("position-panel-empty")).toBeVisible();
  });

  test("risk gauge bar moves as price changes", async ({ page }) => {
    await openLong10xFiftyPercent(page);

    // At entry, distance (20%) > maxDistance (10%) → bar clamped at 0%.
    // A revived tick re-writes the same flat price, so this read is safe.
    const width1 = await readDistanceBarWidth(page);
    expect(width1).toBe(0);

    // Drop toward liq ($40k): at $42k distance = 4.76% → bar ≈ 52.4% (grows)
    await pollDistanceBarAtForcedPrice(page, 42_000).toBeGreaterThan(50);

    // Recover to $44k: distance = 9.09% → bar ≈ 9.1% (less risk → shrinks)
    await pollDistanceBarAtForcedPrice(page, 44_000).toBeLessThan(15);

    await positionPanel(page).locator("text=Close Position").first().click();
    await expect(page.getByTestId("position-panel-empty")).toBeVisible();
  });

  test("risk gauge reacts to a forced price move while paused", async ({ page }) => {
    await openLong10xFiftyPercent(page);

    const width1 = await readDistanceBarWidth(page);

    // $43k → distance = 6.98% → bar ≈ 30.2%: a clearly visible jump from 0
    await pollDistanceBarAtForcedPrice(page, 43_000).toBeGreaterThan(width1 + 0.5);

    await positionPanel(page).locator("text=Close Position").first().click();
    await expect(page.getByTestId("position-panel-empty")).toBeVisible();
  });
});
