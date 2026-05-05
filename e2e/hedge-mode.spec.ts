import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';
import { openLongMarketViaUI, closePositionViaUI } from './_helpers/ui-actions';

const JID = 'HEDGE-MODE';

test.describe('Reduce Only / Hedge Mode E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('Reduce Only toggle appears when position is open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await saveEvidence(page, JID, '01-no-position');

    // Verify toggle is NOT visible without position
    const controls = page.locator('.card-surface').filter({ hasText: 'Order Controls' });
    const toggleVisibleBefore = await controls.locator('text=Position Mode').isVisible().catch(() => false);
    expect(toggleVisibleBefore).toBe(false);

    // Open a position via UI
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ wallet: 10000, position: null, closedTrades: [] });
    });
    await page.waitForTimeout(300);

    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 50 });
    await saveEvidence(page, JID, '02-position-opened');

    // Now toggle should be visible
    const toggleVisibleAfter = await controls.locator('text=Position Mode').isVisible().catch(() => false);
    expect(toggleVisibleAfter).toBe(true);

    // Verify default is "Reduce Only"
    const modeLabel = controls.locator('text=Reduce Only').first();
    await expect(modeLabel).toBeVisible();

    // Close position
    await closePositionViaUI(page);

    await saveLogs('toggle-visibility');
  });

  test('flip position in Hedge Mode', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine and set known state (wallet=1000 so 10% size = $1000)
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 1000,
        position: null,
        closedTrades: [],
        pendingOrders: [],
        ordersHistory: [],
        currentPrice: 50000,
        price: 50000,
        reduceOnly: true,
      });
    });
    await page.waitForTimeout(500);

    // Open LONG position via UI ($1000 @ 10x → 10% of 1000*10)
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });
    await saveEvidence(page, JID, '03-long-opened');

    // Verify LONG position
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    await expect(posPanel.locator('text=LONG').first()).toBeVisible();

    // Enable Hedge Mode via toggle click
    const controls = page.locator('.card-surface').filter({ hasText: 'Order Controls' });
    const toggleBtn = controls.locator('button[aria-label="Enable hedge mode"]').first();
    await toggleBtn.click();
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '04-hedge-mode-enabled');

    // Verify Hedge Mode label
    const hedgeLabel = controls.locator('text=Hedge Mode').first();
    await expect(hedgeLabel).toBeVisible();

    // Execute flip via store action (slider control via Playwright is unreliable
    // with React controlled inputs; we test the UI setup and verify the flip result via UI)
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      store.getState().openPosition('short', 10, 2500);
    });
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '05-position-flipped');

    // Verify position is now SHORT
    await expect(posPanel.locator('text=SHORT').first()).toBeVisible();

    // Verify position size is the excess: 2500 - 1000 = 1500
    const panelText = await posPanel.innerText();
    console.log('Panel after flip:', panelText.substring(0, 400));
    expect(panelText).toContain('$1,500');

    // Verify a closed trade was created for the original LONG
    const storeState = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        closedTradesCount: s.closedTrades.length,
        firstTradeSide: s.closedTrades[0]?.side,
        realizedPnL: s.realizedPnL,
      };
    });
    expect(storeState.closedTradesCount).toBe(1);
    expect(storeState.firstTradeSide).toBe('long');

    // Cleanup
    await closePositionViaUI(page);

    await saveLogs('hedge-flip');
  });

  test('opposite order in Reduce Only only reduces, never flips', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // wallet=1000 so 10% size = $1000; slider reset = 1000 = full position
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 1000,
        position: null,
        closedTrades: [],
        currentPrice: 50000,
        price: 50000,
        reduceOnly: true,
      });
    });
    await page.waitForTimeout(500);

    // Open LONG $1000 via UI (10% of 1000*10)
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });
    await saveEvidence(page, JID, '06-long-opened');

    // In Reduce Only (default), click opposite side
    // Slider resets to position.size ($1000), so REDUCE POSITION closes fully
    await page.click('text=SHORT');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '07-short-clicked');

    const reduceBtn = page.locator('text=REDUCE POSITION').first();
    await expect(reduceBtn).toBeVisible({ timeout: 5000 });
    await reduceBtn.click();
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '08-reduce-only-result');

    // Position should be closed (null), not flipped
    const storeState = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        hasPosition: !!s.position,
        positionSide: s.position?.side,
        closedTradesCount: s.closedTrades.length,
      };
    });

    expect(storeState.hasPosition).toBe(false);
    expect(storeState.closedTradesCount).toBe(1);

    await saveLogs('reduce-only');
  });
});
