import { test, expect } from '@playwright/test';
import { saveEvidence } from './_helper';

const JID = 'TRADING-01';

test.describe('Trading Simulator Smoke', () => {
  test('full simulation journey', async ({ page }) => {
    // Prevent onboarding from showing
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });

    // 1. Enter the page
    await page.goto('/trading');
    await expect(page.locator('body')).toBeVisible();
    await saveEvidence(page, JID, '01-page-loaded');

    // 2. Loader visible
    await page.waitForSelector('text=Starting TimeWarp', { timeout: 5000 });
    await saveEvidence(page, JID, '02-loader-visible');

    // 3. Simulation started (clock appears)
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await saveEvidence(page, JID, '03-simulation-started');

    // 4. Chart with first candles (3s)
    await page.waitForTimeout(3000);
    await saveEvidence(page, JID, '04-chart-3s');

    // 5. Chart advancing (10s)
    await page.waitForTimeout(7000);
    await saveEvidence(page, JID, '05-chart-10s');

    // 6. Chart advancing more (20s)
    await page.waitForTimeout(10000);
    await saveEvidence(page, JID, '06-chart-20s');

    // 7. Pause
    await page.click('text=Pause');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '07-paused');

    // 8. New session
    await page.click('text=New');
    await page.waitForSelector('text=Starting TimeWarp', { timeout: 5000 });
    await saveEvidence(page, JID, '08-new-session-loader');

    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '09-new-session-running');
  });
});
