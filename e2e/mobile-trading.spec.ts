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

  test('mobile bottom sheet toggle shows and hides TradeControls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Only runs on mobile viewport');
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // TradeControls hidden by default on mobile (showControls = false)
    const orderControls = page.locator('h3').filter({ hasText: 'Order Controls' });
    await expect(orderControls).not.toBeVisible();

    // Click the toggle button to open controls
    const toggleBtn = page.locator('button').filter({ hasText: /Open Position|Close Controls/i }).first();
    await toggleBtn.click();
    await page.waitForTimeout(400);

    // TradeControls now visible
    await expect(orderControls).toBeVisible();

    // Click again to close
    const closeBtn = page.locator('button').filter({ hasText: /Close Controls/i }).first();
    await closeBtn.click();
    await page.waitForTimeout(400);

    await expect(orderControls).not.toBeVisible();
  });

  test('mobile bottom sheet opens when position is opened via UI', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Only runs on mobile viewport');
    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Open controls panel
    await page.locator('button').filter({ hasText: /Open Position/i }).first().click();
    await page.waitForTimeout(500);

    await page.getByTestId('trade-controls-side-long').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').first().click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').first().click();
    await page.waitForTimeout(200);
    await page.getByTestId('trade-controls-action-btn').click();
    await page.waitForTimeout(1000);

    // Position panel should be visible
    await expect(page.locator('text=Your Position').first()).toBeVisible();
  });
});
