import { test, expect } from "@playwright/test";

test.describe("TP/SL validation messages are in English", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/trading");
    await page.waitForSelector("[data-testid='trade-controls-open-long-btn']", { state: "visible" });
  });

  test("invalid TP below entry for LONG shows English error", async ({ page }) => {
    // Open a LONG position first
    await page.click("[data-testid='trade-controls-open-long-btn']");
    await page.waitForSelector("[data-testid='position-panel-pnl']", { state: "visible" });

    // Get current price
    const priceText = await page.locator("[data-testid='current-price']").textContent();
    const currentPrice = parseFloat(priceText?.replace("$", "").replace(",", "") || "0");

    // Try to set TP below current price (invalid for LONG)
    const invalidTp = (currentPrice - 1000).toFixed(0);

    // Expand TP input
    await page.click("text=Take Profit");
    await page.fill("[data-testid='tp-price-input']", invalidTp);
    await page.click("[data-testid='tp-apply-btn']");

    // Wait for toast
    await page.waitForSelector("[data-testid='toast']", { state: "visible" });

    // Verify toast text is in English
    const toastText = await page.locator("[data-testid='toast']").textContent();
    expect(toastText).toContain("Invalid");
    expect(toastText).toContain("ABOVE");

    // Verify NO Portuguese text
    expect(toastText).not.toContain("inválido");
    expect(toastText).not.toContain("acima");
    expect(toastText).not.toContain("coloque");
  });

  test("invalid SL above entry for LONG shows English error", async ({ page }) => {
    // Open a LONG position first
    await page.click("[data-testid='trade-controls-open-long-btn']");
    await page.waitForSelector("[data-testid='position-panel-pnl']", { state: "visible" });

    const priceText = await page.locator("[data-testid='current-price']").textContent();
    const currentPrice = parseFloat(priceText?.replace("$", "").replace(",", "") || "0");

    // Try to set SL above current price (invalid for LONG)
    const invalidSl = (currentPrice + 1000).toFixed(0);

    // Expand SL input
    await page.click("text=Stop Loss");
    await page.fill("[data-testid='sl-price-input']", invalidSl);
    await page.click("[data-testid='sl-apply-btn']");

    await page.waitForSelector("[data-testid='toast']", { state: "visible" });

    const toastText = await page.locator("[data-testid='toast']").textContent();
    expect(toastText).toContain("Invalid");
    expect(toastText).toContain("BELOW");

    expect(toastText).not.toContain("inválido");
    expect(toastText).not.toContain("abaixo");
    expect(toastText).not.toContain("coloque");
  });

  test("invalid TP above entry for SHORT shows English error", async ({ page }) => {
    // Open a SHORT position
    await page.click("[data-testid='trade-controls-open-short-btn']");
    await page.waitForSelector("[data-testid='position-panel-pnl']", { state: "visible" });

    const priceText = await page.locator("[data-testid='current-price']").textContent();
    const currentPrice = parseFloat(priceText?.replace("$", "").replace(",", "") || "0");

    // Try to set TP above current price (invalid for SHORT)
    const invalidTp = (currentPrice + 1000).toFixed(0);

    await page.click("text=Take Profit");
    await page.fill("[data-testid='tp-price-input']", invalidTp);
    await page.click("[data-testid='tp-apply-btn']");

    await page.waitForSelector("[data-testid='toast']", { state: "visible" });

    const toastText = await page.locator("[data-testid='toast']").textContent();
    expect(toastText).toContain("Invalid");
    expect(toastText).toContain("BELOW");

    expect(toastText).not.toContain("inválido");
    expect(toastText).not.toContain("abaixo");
  });
});
