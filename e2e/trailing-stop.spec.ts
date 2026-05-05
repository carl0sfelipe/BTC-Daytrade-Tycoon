import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';
import { openLongMarketViaUI } from './_helpers/ui-actions';

const JID = 'TRAILING-STOP';

test.describe('Trailing Stop-Loss E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('trailing stop closes long position when price retraces', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine for deterministic control
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 1000,
        position: null,
        closedTrades: [],
        currentPrice: 50000,
        price: 50000,
      });
    });
    await page.waitForTimeout(500);

    // Open LONG $1000 via UI
    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });
    await saveEvidence(page, JID, '01-long-opened');

    // Set trailing stop to 5%
    const controls = page.locator('.card-surface').filter({ hasText: 'Order Controls' });
    const tsInput = controls.locator('input[type="number"]').first();
    await tsInput.fill('5');
    await page.waitForTimeout(200);
    await controls.locator('text=Set').first().click();
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '02-trailing-set');

    // Verify PositionPanel shows trailing stop indicator
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    await expect(posPanel.locator('text=Trailing Stop').first()).toBeVisible();

    // Move price UP 10% (to 55000) — trailing stop should follow
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: 55000, price: 55000 });
      store.getState().checkPosition(55000);
    });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '03-price-up');

    // Verify trailing stop price moved up (should be ~52250)
    const storeAfterRise = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return { tsPrice: s.position?.trailingStopPrice };
    });
    expect(storeAfterRise.tsPrice).toBeGreaterThan(47500);

    // Move price DOWN below trailing stop — position should close
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ currentPrice: 52000, price: 52000 });
      (window as any).__tradingStore.getState().checkPosition(52000);
    });
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '04-trailing-hit');

    // Position should be closed with reason trailing_stop
    const storeState = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        hasPosition: !!s.position,
        closedTradesCount: s.closedTrades.length,
        lastReason: s.closedTrades[0]?.reason,
      };
    });
    expect(storeState.hasPosition).toBe(false);
    expect(storeState.closedTradesCount).toBe(1);
    expect(storeState.lastReason).toBe('trailing_stop');

    await saveLogs('trailing-stop-long');
  });

  test('remove trailing stop clears it from position', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 1000,
        position: null,
        closedTrades: [],
        currentPrice: 50000,
        price: 50000,
      });
    });
    await page.waitForTimeout(500);

    await openLongMarketViaUI(page, { leverage: 10, sizePercent: 10 });

    const controls = page.locator('.card-surface').filter({ hasText: 'Order Controls' });
    const tsInput = controls.locator('input[type="number"]').first();
    await tsInput.fill('3');
    await controls.locator('text=Set').first().click();
    await page.waitForTimeout(300);

    // Remove trailing stop
    await controls.locator('text=Remove').first().click();
    await page.waitForTimeout(300);

    const storeState = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return { tsPercent: s.position?.trailingStopPercent, tsPrice: s.position?.trailingStopPrice };
    });
    expect(storeState.tsPercent).toBeNull();
    expect(storeState.tsPrice).toBeNull();
  });
});
