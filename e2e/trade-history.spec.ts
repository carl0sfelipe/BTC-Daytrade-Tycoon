import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'TRADE-HISTORY';

test.describe('Trade History', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('closed trades appear in Trade History with correct P&L', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine and seed a closed trade
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10050,
        position: null,
        closedTrades: [
          { pnl: 50, side: 'long', reason: 'manual', entryPrice: 50000, exitPrice: 50250, size: 1000, leverage: 10, margin: 100, entryTime: '01/01/2020, 12:00:00', exitTime: '01/01/2020, 12:05:00' },
          { pnl: -30, side: 'short', reason: 'sl', entryPrice: 51000, exitPrice: 51510, size: 500, leverage: 10, margin: 50, entryTime: '01/01/2020, 13:00:00', exitTime: '01/01/2020, 13:02:00' },
        ],
      });
    });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '01-trades-seeded');

    // Open History tab
    await page.click('button:has-text("History")');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '02-history-tab');

    // Verify trades are visible
    const historyPanel = page.locator('.card-surface').filter({ hasText: /Trade History|Trades/i });
    const text = await historyPanel.innerText();

    expect(text).toMatch(/long/i);
    expect(text).toMatch(/short/i);
    expect(text).toContain('+');
    expect(text).toContain('-');

    await saveLogs('history');
  });

  test('realized P&L accumulates across multiple partial closes', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      store.setState({
        wallet: 10000,
        currentPrice: 52000,
        price: 52000,
        position: {
          side: 'long',
          entry: 50000,
          size: 500,
          leverage: 10,
          liquidationPrice: 45000,
          tpPrice: null,
          slPrice: null,
          entryTime: 'now',
          realizedPnL: 30, // $20 + $10 from previous partial closes
        },
        realizedPnL: 30,
        closedTrades: [],
      });
    });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '03-partial-close-state');

    // Verify PositionPanel shows realized P&L
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    const text = await posPanel.innerText();
    expect(text).toMatch(/Realized P&L/i);
    expect(text).toContain('+');

    // Close the remaining position
    await page.evaluate(() => {
      (window as any).__tradingStore.getState().closePosition('manual');
    });
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '04-after-full-close');

    // Verify trade history has correct total P&L (prior realized + current close)
    const storeState = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        closedTradesCount: s.closedTrades.length,
        tradePnl: s.closedTrades[0]?.pnl,
        sessionRealizedPnL: s.realizedPnL,
      };
    });

    // P&L of remaining $500 at $52k = (2000/50000) * 500 = 20
    // Total trade P&L = 30 (prior) + 20 = 50
    expect(storeState.closedTradesCount).toBe(1);
    expect(storeState.tradePnl).toBeCloseTo(50, 0);

    await saveLogs('partial-close');
  });
});
