import { test, expect } from '@playwright/test';

test.describe('Mobile Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('mobile shows Chart tab by default and can switch to History', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Only runs on mobile viewport');
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Chart tab should be visible and active by default
    const chartTab = page.locator('button').filter({ hasText: /^Chart$/i }).first();
    await expect(chartTab).toBeVisible();

    // History tab should be visible
    const historyTab = page.locator('button').filter({ hasText: /^History$/i }).first();
    await expect(historyTab).toBeVisible();

    // Click History tab
    await historyTab.click();
    await page.waitForTimeout(500);

    // TradeHistory should be visible
    await expect(page.locator('text=Trade History').first()).toBeVisible();
  });

  test('mobile bottom sheet opens when position is opened', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Only runs on mobile viewport');
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Open bottom sheet and then position
    await page.click('text=Open Position');
    await page.waitForTimeout(500);
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(1000);

    // Position panel should be visible
    await expect(page.locator('text=Your Position').first()).toBeVisible();
  });
});
