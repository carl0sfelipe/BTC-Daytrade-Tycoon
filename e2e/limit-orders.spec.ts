import { test, expect } from '@playwright/test';
import { saveEvidence, captureConsoleLogs } from './_helper';

const JID = 'LIMIT-ORDERS';

test.describe('Limit Orders E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('trading-storage', JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 }));
    });
  });

  test('create and cancel a limit order', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await saveEvidence(page, JID, '01-page-loaded');

    // Switch to Limit order
    await page.click('button:has-text("Limit")');
    await page.waitForTimeout(200);

    // Fill limit price (use current price from store)
    const currentPrice = await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      return store.getState().currentPrice;
    });
    const limitPrice = (currentPrice * 0.98).toFixed(2);

    // The limit price input is the 3rd text input (TP=0.00, SL=0.00, Limit=currentPrice)
    const limitInput = page.locator('input[type="text"]').nth(2);
    await limitInput.fill(limitPrice);
    await page.waitForTimeout(200);

    // Select size
    await page.locator('button:has-text("25%")').click();
    await page.waitForTimeout(200);

    // Place limit order
    await page.click('button:has-text("Place Long Limit")');
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '02-limit-order-placed');

    // Verify order appears in Orders Panel
    const ordersPanel = page.locator('.card-surface').filter({ hasText: 'Orders' });
    await expect(ordersPanel.locator('text=Pending').first()).toBeVisible({ timeout: 5000 });

    const orderRow = ordersPanel.locator('div').filter({ hasText: /limit/i }).first();
    await expect(orderRow).toBeVisible();

    // Cancel the pending order
    const cancelBtn = ordersPanel.locator('button').filter({ hasText: /Cancel/i }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '03-order-cancelled');

    // Verify order status changed to Canceled
    await expect(ordersPanel.locator('text=Canceled').first()).toBeVisible({ timeout: 5000 });

    await saveLogs('create-cancel');
  });

  test('limit order executes when price hits', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine so we control price
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
    });
    await page.waitForTimeout(300);

    // Set a known price
    const knownPrice = 50000;
    await page.evaluate((price) => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: price, price });
    }, knownPrice);
    await page.waitForTimeout(300);

    // Place a limit order ABOVE current price so it executes immediately
    const limitPrice = (knownPrice * 1.01).toFixed(2);

    await page.click('button:has-text("Limit")');
    await page.waitForTimeout(200);
    // The limit price input is the 3rd text input (TP=0.00, SL=0.00, Limit=currentPrice)
    const limitInput = page.locator('input[type="text"]').nth(2);
    await limitInput.fill(limitPrice);
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);

    await page.click('button:has-text("Place Long Limit")');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '04-limit-above-price');

    // Order should still be pending (price hasn't hit yet)
    const ordersPanel = page.locator('.card-surface').filter({ hasText: 'Orders' });
    await expect(ordersPanel.locator('text=Pending').first()).toBeVisible({ timeout: 3000 });

    // Now move price to hit the limit
    await page.evaluate((price) => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: price, price });
    }, Number(limitPrice));
    await page.waitForTimeout(1000);
    await saveEvidence(page, JID, '05-price-hit-limit');

    // Force checkPendingOrders to run
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      const state = store.getState();
      state.checkPendingOrders(state.currentPrice);
    });
    await page.waitForTimeout(800);
    await saveEvidence(page, JID, '06-limit-executed');

    // Verify position was opened
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    await expect(posPanel.locator('text=Close Position').first()).toBeVisible({ timeout: 5000 });

    // Verify order shows as Filled
    await expect(ordersPanel.locator('text=Filled').first()).toBeVisible({ timeout: 5000 });

    // Cleanup
    await posPanel.locator('text=Close Position').first().click();
    await page.waitForTimeout(500);

    await saveLogs('limit-execution');
  });

  test('limit order on opposite side reduces existing position', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'production', 'Uses __tradingStore injection');
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await page.goto('/trading');
    await page.waitForSelector('text=Simulation Time', { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Pause engine
    await page.evaluate(() => {
      const engine = (window as any).__timewarpEngine;
      if (engine && engine.pause) engine.pause();
    });
    await page.waitForTimeout(300);

    // Reset store
    await page.evaluate(() => {
      (window as any).__tradingStore.setState({
        wallet: 10000,
        position: null,
        closedTrades: [],
        pendingOrders: [],
        ordersHistory: [],
        currentPrice: 50000,
        price: 50000,
      });
    });
    await page.waitForTimeout(300);

    // Open LONG position
    await page.click('text=LONG');
    await page.waitForTimeout(200);
    await page.locator('button:has-text("10x")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("50%")').click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Open Long")');
    await page.waitForTimeout(800);

    // Verify position is open
    const posPanel = page.locator('.card-surface').filter({ hasText: 'Your Position' });
    await expect(posPanel.locator('text=Close Position').first()).toBeVisible();

    // Place opposite-side limit order (SHORT)
    const limitPrice = '51000';
    await page.click('button:has-text("Limit")');
    await page.waitForTimeout(200);
    await page.click('text=SHORT');
    await page.waitForTimeout(200);
    // The limit price input is the 3rd text input (TP=0.00, SL=0.00, Limit=currentPrice)
    const limitInput = page.locator('input[type="text"]').nth(2);
    await limitInput.fill(limitPrice);
    await page.waitForTimeout(200);
    // Use a small size for reduction
    await page.evaluate(() => {
      const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
      if (slider) slider.value = '500';
      slider?.dispatchEvent(new Event('input', { bubbles: true }));
      slider?.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    await page.click('button:has-text("Place Short Limit")');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '07-reduce-limit-placed');

    // Move price to hit the limit
    await page.evaluate(() => {
      const store = (window as any).__tradingStore;
      store.setState({ currentPrice: 51000, price: 51000 });
      const state = store.getState();
      state.checkPendingOrders(51000);
    });
    await page.waitForTimeout(1000);
    await saveEvidence(page, JID, '08-reduce-limit-executed');

    // Position should still exist but smaller
    const panelText = await posPanel.innerText();
    console.log('Position panel after reduce:', panelText.substring(0, 400));

    // Should show a smaller size or be closed
    // With $50k position reduced by $500, size should be ~$49.5k
    expect(panelText).toMatch(/\$4[\d,]+/); // still has position in $40k+ range

    // Close remaining position
    if (await posPanel.locator('text=Close Position').first().isVisible().catch(() => false)) {
      await posPanel.locator('text=Close Position').first().click();
      await page.waitForTimeout(500);
    }

    await saveLogs('limit-reduce');
  });
});
