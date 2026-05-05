import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'END-SESSION';

test.describe('End Session with Open Position', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('ending session with open position closes it and shows P&L', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause and seed position
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
        currentPrice: 52000,
        price: 52000,
      });
    });
    await page.waitForTimeout(500);

    // Open LONG $1000 @ 50k → current 52k = +$40 unrealized
    await page.evaluate(() => {
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, '', '', null);
    });
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '01-position-open');

    // Click End
    await page.click('button:has-text("End")');
    await page.waitForSelector('text=Simulation Ended', { timeout: 5000 });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '02-end-modal');

    // Verify modal shows session stats
    await expect(page.locator('text=Session Return').first()).toBeVisible();

    // Verify position was closed
    const after = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        hasPosition: !!s.position,
        closedTrades: s.closedTrades.length,
        lastCloseReason: s.lastCloseReason,
      };
    });
    expect(after.hasPosition).toBe(false);
    expect(after.closedTrades).toBe(1);

    // Start new session
    await page.click('button:has-text("New Session")');
    await page.waitForSelector('text=Starting TimeWarp', { timeout: 5000 });
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1000);
    await saveEvidence(page, JID, '03-new-session');

    // Verify clean state after new session
    const clean = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        hasPosition: !!s.position,
        closedTrades: s.closedTrades.length,
        isLiquidated: s.isLiquidated,
        simulationRealDate: s.simulationRealDate,
      };
    });
    expect(clean.hasPosition).toBe(false);
    expect(clean.closedTrades).toBe(0);
    expect(clean.isLiquidated).toBe(false);
    expect(clean.simulationRealDate).toBeNull();

    await saveLogs('end-session');
  });
});
