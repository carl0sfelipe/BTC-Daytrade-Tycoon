import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'SESSION-RESET';

test.describe('Session Reset Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('new session resets all trading state', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
    });
    await page.waitForTimeout(300);

    // Open a position via UI/store to seed state
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
        pendingOrders: [],
        ordersHistory: [],
        realizedPnL: 0,
        reduceOnly: true,
        currentPrice: 50000,
        price: 50000,
      });
    });
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, '', '', null);
    });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '01-position-opened');

    // Verify position is open
    const before = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        hasPosition: !!s.position,
        closedTrades: s.closedTrades.length,
        wallet: s.wallet,
      };
    });
    expect(before.hasPosition).toBe(true);
    expect(before.wallet).toBe(9900);

    // Click New session
    await page.click('button:has-text("New")');
    await page.waitForSelector('text=Starting TimeWarp', { timeout: 5000 });
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await saveEvidence(page, JID, '02-after-reset');

    // Verify state is fully reset
    const after = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
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

    expect(after.hasPosition).toBe(false);
    expect(after.closedTrades).toBe(0);
    expect(after.pendingOrders).toBe(0);
    expect(after.ordersHistory).toBe(0);
    expect(after.realizedPnL).toBe(0);
    expect(after.reduceOnly).toBe(true);
    expect(after.wallet).toBe(10000);
    expect(after.isLiquidated).toBe(false);
    expect(after.simulationRealDate).toBeNull();

    await saveLogs('reset');
  });

  test('new session after liquidation resets liquidated flag', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Inject liquidated state
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      store.setState({
        isLiquidated: true,
        simulationRealDate: '01/01/2020 → 02/01/2020',
        position: null,
        closedTrades: [{ pnl: -1000, side: 'long', reason: 'liquidation', entryPrice: 50000, exitPrice: 45000, size: 1000, leverage: 10, margin: 100, entryTime: 't1', exitTime: 't2', durationSeconds: 60 }],
      });
    });
    await page.waitForTimeout(500);

    // Verify liquidation modal is visible
    const liqModal = page.locator('.card-surface, [role="dialog"]').filter({ hasText: /liquidat/i });
    await expect(liqModal.first()).toBeVisible({ timeout: 5000 });
    await saveEvidence(page, JID, '03-liquidated-state');

    // Click New Session
    await page.click('button:has-text("New Session")');
    await page.waitForSelector('text=Starting TimeWarp', { timeout: 5000 });
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await saveEvidence(page, JID, '04-after-liquidation-reset');

    // Verify liquidated flag is cleared
    const after = await page.evaluate(() => {
      return (window as any).__tradingStore.getState().isLiquidated;
    });
    expect(after).toBe(false);

    await saveLogs('liquidation-reset');
  });
});
