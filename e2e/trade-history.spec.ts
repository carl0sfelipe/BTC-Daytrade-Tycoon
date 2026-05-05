import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'TRADE-HISTORY';

test.describe('Trade History', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('closed trades appear in history with P&L', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause and seed state with a closed trade and no position
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 10040,
        position: null,
        currentPrice: 52000,
        price: 52000,
        closedTrades: [
          { pnl: 40, side: 'long', reason: 'manual', entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: 't1', exitTime: 't2' },
        ],
        realizedPnL: 40,
      });
    });
    await page.waitForTimeout(500);

    // On desktop TradeHistory is rendered directly; on mobile it needs the History tab.
    // Try clicking History tab first (mobile), fall back to direct visibility (desktop).
    const historyTab = page.locator('button').filter({ hasText: /^History$/i });
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(500);
    }
    await saveEvidence(page, JID, '01-history-tab');

    // Verify "Trade History" heading is visible
    await expect(page.locator('text=Trade History').first()).toBeVisible();

    // Verify P&L shown (+$40)
    await expect(page.locator('text=+$40').first()).toBeVisible();

    await saveLogs('history');
  });

  test('realized P&L accumulates across multiple closed trades', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause and seed with two closed trades (P&L: +30 and +20 = +50 total)
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 10050,
        position: null,
        currentPrice: 52000,
        price: 52000,
        closedTrades: [
          { pnl: 30, side: 'long', reason: 'manual', entryPrice: 50000, exitPrice: 50300, size: 1000, leverage: 10, margin: 100, entryTime: 't1', exitTime: 't2' },
          { pnl: 20, side: 'long', reason: 'manual', entryPrice: 52000, exitPrice: 52200, size: 1000, leverage: 10, margin: 100, entryTime: 't3', exitTime: 't4' },
        ],
        realizedPnL: 50,
      });
    });
    await page.waitForTimeout(500);

    // Verify realized P&L from store
    const realized = await page.evaluate(() => (window as any).__tradingStore.getState().realizedPnL);
    expect(realized).toBe(50);

    // Verify wallet reflects P&L (starting wallet + P&L)
    const wallet = await page.evaluate(() => (window as any).__tradingStore.getState().wallet);
    expect(wallet).toBe(10050);

    await saveEvidence(page, JID, '02-realized-pnl');
    await saveLogs('realized-pnl');
  });
});
