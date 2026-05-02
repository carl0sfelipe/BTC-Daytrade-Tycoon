import { test, expect } from '@playwright/test';
import { saveEvidence } from './_helper';

const JID = 'DATE-REVEAL';

test.describe('Historical date reveal', () => {
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

    const dateText = await page.locator('text=Real Historical Period').locator('..').locator('div.font-mono').textContent();
    expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}(?:,\s*\d{2}:\d{2})?\s*→\s*\d{2}\/\d{2}\/\d{4}(?:,\s*\d{2}:\d{2})?/);

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

    // Inject position with liquidationPrice above current price (long liquidated on next tick)
    // and set simulationRealDate to ensure the modal has a valid date.
    await page.evaluate(() => {
      const store = (window as unknown as { __tradingStore: { getState: () => { currentPrice: number }; setState: (s: object) => void } }).__tradingStore;
      const cp = store.getState().currentPrice;
      store.setState({
        position: {
          side: 'long',
          entry: cp,
          size: 1000,
          leverage: 100,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: cp * 1.5,
        },
      });
    });

    await page.waitForSelector('text=ACCOUNT LIQUIDATED', { timeout: 5000 });
    await saveEvidence(page, JID, '04-liquidation-modal');

    const liqDate = await page.locator('text=Real Historical Period').locator('..').locator('div.font-mono').textContent();
    expect(liqDate).toMatch(/\d{2}\/\d{2}\/\d{4}(?:,\s*\d{2}:\d{2})?\s*→\s*\d{2}\/\d{2}\/\d{4}(?:,\s*\d{2}:\d{2})?/);

    await page.click('button:has-text("New Session")');
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '05-after-new-session');
  });
});
