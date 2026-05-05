import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'ONBOARDING';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so onboarding shows
    await page.addInitScript(() => {
      localStorage.removeItem('trading-storage');
    });
  });

  test('onboarding modal appears for first-time user and can be skipped', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '01-onboarding-appears');

    // Verify onboarding modal is visible
    const onboarding = page.locator('.card-surface, [role="dialog"]').filter({ hasText: /Welcome|Tutorial|TimeWarp|Blind Date/i });
    await expect(onboarding.first()).toBeVisible({ timeout: 10000 });

    // Click Skip
    await page.click('button:has-text("Skip")');
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '02-after-skip');

    // Onboarding should be gone and simulation should load
    await expect(page.locator('text=Simulation Time').first()).toBeVisible({ timeout: 30000 });

    // Verify hasSeenOnboarding was saved
    const hasSeen = await page.evaluate(() => {
      const raw = localStorage.getItem('trading-storage');
      if (!raw) return false;
      return JSON.parse(raw).state?.hasSeenOnboarding === true;
    });
    expect(hasSeen).toBe(true);

    await saveLogs('skip');
  });

  test('onboarding can be navigated through all steps', async ({ page }) => {
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForTimeout(2000);

    // Step through onboarding
    const maxSteps = 5;
    for (let i = 0; i < maxSteps; i++) {
      await saveEvidence(page, JID, `03-step-${i + 1}`);
      const nextBtn = page.locator('button').filter({ hasText: /Next|Continue|Got it/i }).first();
      const visible = await nextBtn.isVisible().catch(() => false);
      if (!visible) break;
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // After finishing, simulation should load
    await expect(page.locator('text=Simulation Time').first()).toBeVisible({ timeout: 30000 });

    await saveLogs('full-flow');
  });
});
