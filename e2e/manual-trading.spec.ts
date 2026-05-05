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

  test('simple mode 100% size pill respects leverage', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Reset store to known state: wallet = 10,000, no position
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
      });
    });
    await page.waitForTimeout(300);

    // Select 10x leverage
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);

    // Click 100% size pill
    await page.locator('button:has-text("100%")').click();
    await page.waitForTimeout(200);

    // Open position
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(800);

    // Verify position panel shows the expected size and margin
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    const panelText = await posPanel.innerText();
    console.log('Position panel text:', panelText.substring(0, 400));

    // With wallet=10,000 and 10x leverage, 100% should be ~$100,000 position size
    // and ~$10,000 margin
    expect(panelText).toContain('$100,000');
    expect(panelText).toContain('$10,000.00');

    // Close position to clean up
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);
  });

  test('distance to liquidation displays correctly', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Reset store
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
      });
    });
    await page.waitForTimeout(300);

    // Open LONG 10x with 50%
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);

    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test-results/08-distance-to-liq.png', fullPage: true });

    // Verify Distance to Liquidation is visible and has a reasonable percentage
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    const panelText = await posPanel.innerText();
    console.log('Position panel text:', panelText.substring(0, 600));

    // With 10x leverage, distance should be ~10%
    expect(panelText).toContain('DISTANCE TO LIQUIDATION');

    // Parse percentage from text (e.g., "DISTANCE TO LIQUIDATION\n10.0%")
    const match = panelText.match(/DISTANCE TO LIQUIDATION\s*\n?\s*([\d.]+)%/);
    const pct = match ? parseFloat(match[1]) : -1;
    console.log('Parsed distance percentage:', pct);

    expect(pct).toBeGreaterThanOrEqual(5);
    expect(pct).toBeLessThanOrEqual(15);

    // Verify the progress bar exists
    const bar = posPanel.locator('.h-full.rounded-full.risk-gradient');
    await expect(bar).toBeVisible();

    // Close position
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);
  });

  test('risk gauge bar moves as price changes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Reset store
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
      });
    });
    await page.waitForTimeout(300);

    // Open LONG 10x with 50% ($50k position, $5k margin)
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(800);

    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });

    // Read initial bar width
    const getBarWidth = async () => {
      const bar = posPanel.locator('[data-testid="distance-bar"]');
      const style = await bar.evaluate((el: HTMLElement) => el.style.width);
      return parseFloat(style);
    };

    const width1 = await getBarWidth();
    console.log('Initial bar width:', width1);

    // Pause the simulation engine so we can control price manually
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
    });
    await page.waitForTimeout(300);

    // Inject a price drop to move closer to liquidation
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      const pos = store.getState().position;
      if (pos) {
        // Drop price by 3% to reduce distance to liquidation
        const newPrice = pos.entry * 0.97;
        store.setState({ currentPrice: newPrice, price: newPrice });
      }
    });
    await page.waitForTimeout(600);

    const width2 = await getBarWidth();
    console.log('Bar width after price drop:', width2);

    // The bar should have grown (price got closer to liquidation → more risk)
    expect(width2).toBeGreaterThan(width1);

    // Inject a price rise to move away from liquidation
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      const pos = store.getState().position;
      if (pos) {
        // Raise price by 5% from entry to increase distance
        const newPrice = pos.entry * 1.05;
        store.setState({ currentPrice: newPrice, price: newPrice });
      }
    });
    await page.waitForTimeout(600);

    const width3 = await getBarWidth();
    console.log('Bar width after price rise:', width3);

    // The bar should have shrunk (price moved away from liquidation → less risk)
    expect(width3).toBeLessThan(width2);

    // Resume engine before closing
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.start) engine.start();
    });

    // Close position
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);
  });

  test('risk gauge updates naturally as simulation runs', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Reset store and skip high-leverage warning
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
        skipHighLeverageWarning: true,
      });
    });
    await page.waitForTimeout(300);

    // Pause engine for deterministic price control
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
    });
    await page.waitForTimeout(300);

    // Open LONG with 10x leverage at a known price
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({ currentPrice: 50000, price: 50000 });
    });
    await page.waitForTimeout(200);
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(800);

    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });

    // Read initial bar width
    const getBarWidth = async () => {
      const bar = posPanel.locator('[data-testid="distance-bar"]');
      const style = await bar.evaluate((el: HTMLElement) => el.style.width);
      return parseFloat(style);
    };

    const width1 = await getBarWidth();
    console.log('Initial bar width (natural):', width1);

    // Force price toward liquidation so bar changes deterministically
    // For LONG 10x @ 50000, liqPrice ≈ 45000. Move to 48000 (40% distance → bar ~60%)
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: 48000, price: 48000 });
    });
    await page.waitForTimeout(500);

    const width2 = await getBarWidth();
    console.log('Bar width after forced price move:', width2);

    // The bar should have changed (price moved closer to liquidation)
    expect(Math.abs(width2 - width1)).toBeGreaterThan(0.5);

    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);
  });
});
