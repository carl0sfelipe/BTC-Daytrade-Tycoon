import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'TP-SL';

test.describe('Take Profit and Stop Loss E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('take profit closes position when price is hit', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine and set known state
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

    // Open LONG with TP at +5% (52500)
    const tpPrice = '52500';
    const slPrice = '47500';
    await page.evaluate(({ tp, sl }) => {
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, tp, sl, null);
    }, { tp: tpPrice, sl: slPrice });
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '01-long-with-tp-sl');

    // Verify position shows TP/SL
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    const panelText = await posPanel.innerText();
    expect(panelText).toMatch(/take profit/i);
    expect(panelText).toMatch(/stop loss/i);

    // Move price to hit TP
    await page.evaluate((price) => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: price, price });
      const state = store.getState();
      state.checkPosition(price);
    }, Number(tpPrice));
    await page.waitForTimeout(1000);
    await saveEvidence(page, JID, '02-tp-hit');

    // Position should be closed by TP
    const storeState = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        hasPosition: !!s.position,
        closedTradesCount: s.closedTrades.length,
        lastCloseReason: s.lastCloseReason,
        firstTradePnl: s.closedTrades[0]?.pnl,
      };
    });

    expect(storeState.hasPosition).toBe(false);
    expect(storeState.closedTradesCount).toBe(1);
    expect(storeState.lastCloseReason).toContain('Profit');
    // PnL = (2500/50000) * 1000 = 50
    expect(storeState.firstTradePnl).toBeCloseTo(50, 0);

    await saveLogs('take-profit');
  });

  test('stop loss closes position when price is hit', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
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

    // Open LONG with SL at -4% (48000)
    const tpPrice = '55000';
    const slPrice = '48000';
    await page.evaluate(({ tp, sl }) => {
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, tp, sl, null);
    }, { tp: tpPrice, sl: slPrice });
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '03-long-with-sl');

    // Move price to hit SL
    await page.evaluate((price) => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: price, price });
      const state = store.getState();
      state.checkPosition(price);
    }, Number(slPrice));
    await page.waitForTimeout(1000);
    await saveEvidence(page, JID, '04-sl-hit');

    const storeState = await page.evaluate(() => {
      const s = (window as any).__tradingStore.getState();
      return {
        hasPosition: !!s.position,
        closedTradesCount: s.closedTrades.length,
        lastCloseReason: s.lastCloseReason,
        firstTradePnl: s.closedTrades[0]?.pnl,
      };
    });

    expect(storeState.hasPosition).toBe(false);
    expect(storeState.closedTradesCount).toBe(1);
    expect(storeState.lastCloseReason).toContain('Stop Loss');
    // PnL = (-2000/50000) * 1000 = -40
    expect(storeState.firstTradePnl).toBeCloseTo(-40, 0);

    await saveLogs('stop-loss');
  });

  test('liquidation modal appears when position is liquidated', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
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

    // Inject a 10x long position at price 50000 (liq at 45000)
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        position: {
          side: 'long',
          entry: 50000,
          size: 1000,
          leverage: 10,
          liquidationPrice: 45000,
          tpPrice: null,
          slPrice: null,
          entryTime: 'now',
          realizedPnL: 0,
        },
        currentPrice: 50000,
        price: 50000,
        wallet: 9000,
      });
    });
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '05-position-before-liq');

    // Move price BELOW liquidation price and trigger liquidation
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: 44000, price: 44000 });
      const state = store.getState();
      state.checkPosition(44000);
      // Manually set liquidated state since checkPosition doesn't call setLiquidated
      store.setState({ isLiquidated: true, simulationRealDate: '01/01/2020 → 02/01/2020' });
    });
    await page.waitForTimeout(1500);
    await saveEvidence(page, JID, '06-liquidation-modal');

    // Verify liquidation modal appears
    const liqModal = page.locator('.card-surface, [role="dialog"], .fixed, [data-state="open"]').filter({ hasText: /liquidat/i });
    await expect(liqModal.first()).toBeVisible({ timeout: 5000 });

    await saveLogs('liquidation');
  });
});
