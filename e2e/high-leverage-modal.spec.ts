import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'HIGH-LEV-MODAL';

test.describe('High Leverage Warning Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('≥50x leverage shows confirmation modal in simple mode', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Make sure skip flag is false
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ skipHighLeverageWarning: false });
    });
    await page.waitForTimeout(300);

    // Select 100x leverage
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("100x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);

    // Open position — should trigger high-leverage modal
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '01-modal-appears');

    // Verify warning modal is visible
    const modal = page.locator('.card-surface, [role="dialog"]').filter({ hasText: /risk|warning|High Leverage|50x|100x/i });
    await expect(modal.first()).toBeVisible({ timeout: 5000 });

    // Confirm the trade
    const confirmBtn = page.locator('button').filter({ hasText: /Confirm|I understand|Accept/i }).first();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '02-after-confirm');

    // Position should now be open
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    await expect(posPanel.locator('text=Close Position').first()).toBeVisible();

    // Close position
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);

    await saveLogs('modal-simple');
  });

  test('modal does not appear when skip flag is set', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Set skip flag
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ skipHighLeverageWarning: true });
    });
    await page.waitForTimeout(300);

    // Select 100x and open
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("100x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '03-no-modal');

    // Position should be open immediately without modal
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    await expect(posPanel.locator('text=Close Position').first()).toBeVisible();

    // Verify no warning modal appeared
    const modal = page.locator('.card-surface, [role="dialog"]').filter({ hasText: /risk|warning|High Leverage/i });
    const count = await modal.count();
    expect(count).toBe(0);

    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);

    await saveLogs('skip-flag');
  });
});
