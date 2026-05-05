import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'WALLET-VALIDATION';

test.describe('Wallet & Margin Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('cannot open position larger than wallet allows', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Set wallet to $100 (very small)
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ wallet: 100, position: null });
    });
    await page.waitForTimeout(300);

    // Select 10x and try to open with 100% size
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("100%")').click();
    await page.waitForTimeout(200);

    // Try to open position
    const openBtn = page.locator('button:has-text("Open Long")');
    await openBtn.click();
    await page.waitForTimeout(1000);
    await saveEvidence(page, JID, '01-insufficient-funds');

    // Position should NOT be open
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    const noPos = await posPanel.locator('text=No open position').isVisible().catch(() => false);
    expect(noPos).toBe(true);

    await saveLogs('insufficient');
  });

  test('wallet correctly updates after multiple trades', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
        currentPrice: 50000,
        price: 50000,
      });
    });
    await page.waitForTimeout(500);

    // Open LONG $1000 @ 10x (margin = $100)
    await page.evaluate(() => {
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, '', '', null);
    });
    await page.waitForTimeout(500);

    let wallet1 = await page.evaluate(() => (window as any).__tradingStore.getState().wallet);
    expect(wallet1).toBeCloseTo(9900, 0); // 10000 - 100 margin

    // Increase by $500 (margin = $50)
    await page.evaluate(() => {
      (window as any).__tradingStore.getState().updatePositionSize(1500, 'long');
    });
    await page.waitForTimeout(500);

    let wallet2 = await page.evaluate(() => (window as any).__tradingStore.getState().wallet);
    expect(wallet2).toBeCloseTo(9850, 0); // 9900 - 50 margin

    // Close at $52k (pnl = +40)
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ currentPrice: 52000, price: 52000 });
      (window as any).__tradingStore.getState().closePosition('manual');
    });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '02-wallet-tracked');

    let wallet3 = await page.evaluate(() => (window as any).__tradingStore.getState().wallet);
    // wallet = 9850 + margin(150) + pnl(40) = 10040
    expect(wallet3).toBeCloseTo(10040, 0);

    await saveLogs('wallet-track');
  });
});
