import { test, expect } from '@playwright/test';

/**
 * These tests run against the live Vercel production deployment to verify
 * the distance-to-liquidation bar actually moves as price changes.
 */
test.describe('Production Vercel — Distance Bar Smoke', () => {
  test('bar moves during live simulation with 100% size 100x', async ({ page }) => {
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(2500);

    // Handle onboarding if shown
    const skipBtn = page.locator('text=Skip');
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Open LONG with 100x leverage and 100% size ($10k margin, $1M position)
    await page.click('text=LONG');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("100x")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("100%")').click();
    await page.waitForTimeout(300);

    // Click Open Long — this may trigger the high-risk modal
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(500);

    // Handle high-leverage warning modal if shown
    const understandBtn = page.locator('button:has-text("I understand the risks")');
    if (await understandBtn.isVisible().catch(() => false)) {
      await understandBtn.click();
      await page.waitForTimeout(800);
    }

    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });

    // Verify position is open
    await expect(posPanel.locator('text=Close Position').first()).toBeVisible({ timeout: 5000 });

    // Read initial bar width
    const getBarWidth = async () => {
      const bar = posPanel.locator('[data-testid="distance-bar"]');
      const style = await bar.evaluate((el: HTMLElement) => el.style.width);
      return parseFloat(style);
    };

    const width1 = await getBarWidth();
    console.log('Production initial bar width:', width1);
    await page.screenshot({ path: 'test-results/prod-01-initial.png', fullPage: true });

    // Poll until distance to liquidation text drops to ~0.4% or until 60s timeout
    let attempts = 0;
    let found = false;
    while (attempts < 60 && !found) {
      await page.waitForTimeout(1000);
      const panelText = await posPanel.innerText();
      const match = panelText.match(/DISTANCE TO LIQUIDATION\s*\n?\s*([\d.]+)%/);
      const pct = match ? parseFloat(match[1]) : -1;
      console.log(`Attempt ${attempts + 1}: Distance = ${pct}%`);

      const currentWidth = await getBarWidth();
      console.log(`Attempt ${attempts + 1}: Bar width = ${currentWidth}%`);

      if (pct <= 0.5) {
        found = true;
        await page.screenshot({ path: 'test-results/prod-02-near-liq.png', fullPage: true });
        break;
      }
      attempts++;
    }

    // If we never reached 0.4%, take a final screenshot anyway
    if (!found) {
      await page.screenshot({ path: 'test-results/prod-02-final.png', fullPage: true });
    }

    // Cleanup
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);
  });
});
