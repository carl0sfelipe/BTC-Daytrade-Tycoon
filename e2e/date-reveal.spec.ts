import { test, expect } from '@playwright/test';
import { saveEvidence } from './_helper';

const JID = 'DATE-REVEAL';

test.describe('Historical date reveal', () => {
  test('SimulationClock never shows the drawn real date range', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const clock = page.locator('.card-surface').filter({ hasText: 'Simulation Time' });
    const clockText = await clock.innerText();

    // The real date range uses "→" and Brazilian date format; it must NEVER appear in the clock
    expect(clockText).not.toContain('→');
    expect(clockText).not.toMatch(/\d{2}\/\d{2}\/\d{4},?\s*\d{2}:\d{2}/);
  });

  test('End button opens modal with historical period', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '01-simulation-running');

    await page.click('button:has-text("End")');
    await page.waitForSelector('text=Simulation Ended', { timeout: 5000 });
    await saveEvidence(page, JID, '02-end-modal-with-date');

    // Verify modal shows the redesigned date section
    await expect(page.locator('text=Real Historical Period')).toBeVisible();
    await expect(page.locator('text=Start').first()).toBeVisible();
    await expect(page.locator('text=End').first()).toBeVisible();

    // Verify at least one date is present in monospaced font
    const monoTexts = await page.locator('.font-mono').allTextContents();
    const hasDate = monoTexts.some((t) => /\d{2}\/\d{2}\/\d{4}/.test(t));
    expect(hasDate).toBe(true);

    // Verify time stats are shown
    await expect(page.locator('text=Your Time').first()).toBeVisible();
    await expect(page.locator('text=Historical Time Covered').first()).toBeVisible();

    await page.click('button:has-text("Back")');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '03-back-to-simulation');
  });

  test('liquidation triggers red modal with date', async ({ page }) => {
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    try {
      await page.locator('text=Skip').click({ timeout: 2000 });
      await page.waitForTimeout(300);
    } catch {
      /* no onboarding */
    }
    await page.waitForTimeout(2000);

    // Inject a 100x long position and immediately trigger liquidation
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      const cp = store.getState().currentPrice;
      const liqPrice = cp * 0.99;
      store.setState({
        position: {
          side: 'long',
          entry: cp,
          size: 1000,
          leverage: 100,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: liqPrice,
          entryTime: 'now',
          realizedPnL: 0,
        },
        currentPrice: liqPrice,
        price: liqPrice,
      });
      // Force checkPosition to trigger liquidation immediately
      const state = store.getState();
      state.checkPosition(liqPrice);
      // Set liquidated state so modal appears
      store.setState({ isLiquidated: true, simulationRealDate: '01/01/2020 → 02/01/2020' });
    });

    await page.waitForSelector('text=ACCOUNT LIQUIDATED', { timeout: 5000 });
    await saveEvidence(page, JID, '04-liquidation-modal');

    // Verify modal shows the redesigned date section
    await expect(page.locator('text=Real Historical Period')).toBeVisible();
    await expect(page.locator('text=Start').first()).toBeVisible();
    await expect(page.locator('text=End').first()).toBeVisible();

    const monoTexts = await page.locator('.font-mono').allTextContents();
    const hasDate = monoTexts.some((t) => /\d{2}\/\d{2}\/\d{4}/.test(t));
    expect(hasDate).toBe(true);

    await page.click('button:has-text("New Session")');
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '05-after-new-session');
  });
});
