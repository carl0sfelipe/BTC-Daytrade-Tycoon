import { test, expect } from '@playwright/test';
import { saveEvidence } from './_helper';
import { seedOnboardingDone } from './_helpers/ui-actions';

const JID = 'LEV-TRAIL-UI';

test.describe('Leverage and Trailing Stop via UI', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test('clicking leverage pill updates store.position.leverage while position is open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses store injection for setup');

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Open a position at 10x via store
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000, position: null,
        currentPrice: 50000, price: 50000,
        skipHighLeverageWarning: true,
      });
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, '', '', null);
    });
    await page.waitForTimeout(500);

    // Verify position open at 10x
    let lev = await page.evaluate(() => (window as any).__tradingStore.getState().position?.leverage);
    expect(lev).toBe(10);

    // Click 25x leverage pill in TradeControls
    await page.locator('button:has-text("25x")').first().click();
    await page.waitForTimeout(500);

    // Store position.leverage must update
    lev = await page.evaluate(() => (window as any).__tradingStore.getState().position?.leverage);
    expect(lev).toBe(25);

    await saveEvidence(page, JID, '01-leverage-updated');
  });

  test('trailing stop Set button is disabled for values over 20', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses store injection for setup');

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Open a position so trailing stop input is visible
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000, position: null,
        currentPrice: 50000, price: 50000,
        skipHighLeverageWarning: true,
      });
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, '', '', null);
    });
    await page.waitForTimeout(500);

    // Type invalid value (> 20) into trailing stop input
    const tsInput = page.getByPlaceholder('0.0');
    await tsInput.fill('25');
    await page.waitForTimeout(200);

    // Set button must be disabled (bug B2 regression in E2E)
    const setBtn = page.getByRole('button', { name: 'Set' });
    await expect(setBtn).toBeDisabled();

    await saveEvidence(page, JID, '02-trailing-disabled-over-20');
  });

  test('trailing stop Set and Remove flow updates store via UI', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses store injection for setup');

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000, position: null,
        currentPrice: 50000, price: 50000,
        skipHighLeverageWarning: true,
      });
      (window as any).__tradingStore.getState().openPosition('long', 10, 1000, '', '', null);
    });
    await page.waitForTimeout(500);

    // Type valid trailing stop value and click Set
    const tsInput = page.getByPlaceholder('0.0');
    await tsInput.fill('5');
    await page.waitForTimeout(200);

    const setBtn = page.getByRole('button', { name: 'Set' });
    await expect(setBtn).toBeEnabled();
    await setBtn.click();
    await page.waitForTimeout(300);

    // Store must reflect trailing stop
    const tsPercent = await page.evaluate(() => (window as any).__tradingStore.getState().position?.trailingStopPercent);
    expect(tsPercent).toBe(5);

    // Remove button should now be visible — click it
    const removeBtn = page.getByRole('button', { name: 'Remove' });
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await page.waitForTimeout(300);

    // Store trailing stop cleared
    const cleared = await page.evaluate(() => (window as any).__tradingStore.getState().position?.trailingStopPercent);
    expect(cleared).toBeNull();

    await saveEvidence(page, JID, '03-trailing-set-remove');
  });
});
