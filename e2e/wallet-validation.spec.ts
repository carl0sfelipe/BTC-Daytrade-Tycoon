import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'WALLET-VAL';

test.describe('Wallet Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('cannot open position larger than available wallet', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Set wallet to $100
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ wallet: 100, position: null });
    });
    await page.waitForTimeout(300);

    // Try to open position via store: $2000 @ 10x → margin = $200 > wallet $100
    // Store validates wallet < margin and returns early
    await page.evaluate(() => {
      (window as any).__tradingStore.getState().openPosition('long', 10, 2000, '', '', null);
    });
    await page.waitForTimeout(500);

    // Position should NOT be open
    const after = await page.evaluate(() => (window as any).__tradingStore.getState());
    expect(after.position).toBeNull();
    // Wallet unchanged
    expect(after.wallet).toBe(100);

    await saveEvidence(page, JID, '01-wallet-too-small');
    await saveLogs('wallet-too-small');
  });

  test('wallet updates correctly after opening and closing a position', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine and set known price
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
    await page.waitForTimeout(300);

    // Open LONG $1000 @ 10x → margin = $100
    await page.evaluate(() => {
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, '', '', null);
    });
    await page.waitForTimeout(500);

    // Wallet should be reduced by margin
    let wallet = await page.evaluate(() => (window as any).__tradingStore.getState().wallet);
    expect(wallet).toBe(9900);

    // Close position at same price → P&L = 0
    await page.evaluate(() => {
      (window as any).__tradingStore.getState().closePosition();
    });
    await page.waitForTimeout(500);

    // Wallet after close: 9900 + margin(100) + pnl(0) = 10000
    wallet = await page.evaluate(() => (window as any).__tradingStore.getState().wallet);
    expect(wallet).toBe(10000);

    await saveEvidence(page, JID, '02-wallet-after-trade');
    await saveLogs('wallet-after-trade');
  });
});
