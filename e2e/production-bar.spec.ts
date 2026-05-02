import { test, expect } from '@playwright/test';

/**
 * These tests run against the live Vercel production deployment to verify
 * the distance-to-liquidation bar actually moves as price changes.
 */
test.describe('Production Vercel — Distance Bar Smoke', () => {
  test('bar moves during live simulation', async ({ page }) => {
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(2500);

    // Handle onboarding if shown
    const skipBtn = page.locator('text=Skip');
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Open LONG with 100x leverage (1% initial distance — highly sensitive)
    await page.click('text=LONG');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("100x")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("10%")').click();
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

    // Wait 10 seconds for the live timewarp engine to move price
    await page.waitForTimeout(10000);

    const width2 = await getBarWidth();
    console.log('Production bar width after 10s:', width2);
    await page.screenshot({ path: 'test-results/prod-02-after-10s.png', fullPage: true });

    // The bar must have changed (price moved during simulation)
    expect(Math.abs(width2 - width1)).toBeGreaterThan(0.01);

    // Take one more screenshot after 10 more seconds
    await page.waitForTimeout(10000);
    const width3 = await getBarWidth();
    console.log('Production bar width after 20s:', width3);
    await page.screenshot({ path: 'test-results/prod-03-after-20s.png', fullPage: true });

    expect(Math.abs(width3 - width1)).toBeGreaterThan(0.01);

    // Cleanup
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);
  });
});
