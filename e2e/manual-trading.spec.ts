import { test, expect } from '@playwright/test';

test.describe('Manual Trading Validation', () => {
  test('full position lifecycle', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/01-initial.png', fullPage: true });

    // Step 1: Open LONG 10x with 50% size
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);

    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/02-position-opened.png', fullPage: true });

    // Verify position is open
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    await expect(posPanel.locator('text=Close Position').first()).toBeVisible();

    // Read position panel HTML for debugging
    const posHtml = await posPanel.innerHTML();
    console.log('Position panel HTML snippet:', posHtml.substring(0, 600));

    // Step 2: Move slider to increase position
    const controls = page.locator('.card-surface').filter({ hasText: 'Order Controls' });
    const slider = controls.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Get slider bounds
    const sliderMax = await slider.evaluate((el: HTMLInputElement) => Number(el.max));
    const sliderMin = await slider.evaluate((el: HTMLInputElement) => Number(el.min));
    console.log('Slider min:', sliderMin, 'max:', sliderMax);

    // Move slider using fill (Playwright handles React controlled inputs better)
    const targetIncrease = Math.floor(sliderMax * 0.75);
    await slider.fill(String(targetIncrease));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/03-slider-increase.png', fullPage: true });

    // Read current slider value
    const sliderValAfterInc = await slider.evaluate((el: HTMLInputElement) => Number(el.value));
    console.log('Slider value after increase move:', sliderValAfterInc);

    // Check for increase button
    const increaseBtn = controls.locator('button:has-text("INCREASE POSITION")');
    const hasIncrease = await increaseBtn.isVisible().catch(() => false);
    console.log('Has increase button:', hasIncrease);

    if (hasIncrease) {
      await increaseBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'test-results/04-after-increase.png', fullPage: true });
    }

    // Step 3: Move slider to decrease position
    const targetDecrease = Math.floor(sliderMax * 0.25);
    await slider.fill(String(targetDecrease));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/05-slider-decrease.png', fullPage: true });

    const sliderValAfterDec = await slider.evaluate((el: HTMLInputElement) => Number(el.value));
    console.log('Slider value after decrease move:', sliderValAfterDec);

    const decreaseBtn = controls.locator('button:has-text("DECREASE POSITION")');
    const hasDecrease = await decreaseBtn.isVisible().catch(() => false);
    console.log('Has decrease button:', hasDecrease);

    if (hasDecrease) {
      await decreaseBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'test-results/06-after-decrease.png', fullPage: true });
    }

    // Step 4: Close position via PositionPanel
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/07-after-close.png', fullPage: true });

    // Verify position closed - should show "OPEN LONG" button again
    await expect(controls.locator('button:has-text("Open Long")')).toBeVisible();
  });
});
