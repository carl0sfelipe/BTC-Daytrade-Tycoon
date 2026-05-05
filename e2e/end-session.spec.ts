import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'END-SESSION';

test.describe('End Session with Open Position', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('ending session shows modal with P&L and new session resets state', async ({ page }) => {
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
        wallet: 10040,
        position: null,
        closedTrades: [{ pnl: 40, side: 'long', reason: 'manual', entryPrice: 50000, exitPrice: 52000, size: 1000, leverage: 10, margin: 100, entryTime: 't1', exitTime: 't2', durationSeconds: 300 }],
        currentPrice: 52000,
        price: 52000,
        simulationRealDate: '01/01/2020 → 02/01/2020',
      });
    });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '01-seeded-state');

    // Click End
    await page.click('button:has-text("End")');
    await page.waitForSelector('text=Simulation Ended', { timeout: 5000 });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '02-end-modal');

    // Verify modal shows session stats
    await expect(page.locator('text=Session Return').first()).toBeVisible();
    await expect(page.locator('text=Real Historical Period').first()).toBeVisible();

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
        realizedPnL: s.realizedPnL,
        wallet: s.wallet,
      };
    });
    expect(clean.hasPosition).toBe(false);
    expect(clean.closedTrades).toBe(0);
    expect(clean.isLiquidated).toBe(false);
    expect(clean.simulationRealDate).toBeNull();
    expect(clean.realizedPnL).toBe(0);
    expect(clean.wallet).toBe(10000);

    await saveLogs('end-session');
  });
});
