import type { Page } from "@playwright/test";

export async function seedOnboardingDone(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "trading-storage",
      JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 })
    );
  });
}

export async function openLongMarketViaUI(
  page: Page,
  opts: { leverage: number; sizePercent: 10 | 25 | 50 | 100 }
) {
  await page.click("text=LONG");
  await page.waitForTimeout(200);
  await page.locator(`button:has-text("${opts.leverage}x")`).click();
  await page.waitForTimeout(200);
  await page.locator(`button:has-text("${opts.sizePercent}%")`).click();
  await page.waitForTimeout(200);
  await page.click('button:has-text("Open Long")');
  await page.waitForTimeout(800);

  // Handle high-leverage warning modal if shown
  const understandBtn = page.locator('button:has-text("I understand the risks")');
  if (await understandBtn.isVisible().catch(() => false)) {
    await understandBtn.click();
    await page.waitForTimeout(800);
  }
}

export async function openShortMarketViaUI(
  page: Page,
  opts: { leverage: number; sizePercent: 10 | 25 | 50 | 100 }
) {
  await page.click("text=SHORT");
  await page.waitForTimeout(200);
  await page.locator(`button:has-text("${opts.leverage}x")`).click();
  await page.waitForTimeout(200);
  await page.locator(`button:has-text("${opts.sizePercent}%")`).click();
  await page.waitForTimeout(200);
  await page.click('button:has-text("Open Short")');
  await page.waitForTimeout(800);

  // Handle high-leverage warning modal if shown
  const understandBtn = page.locator('button:has-text("I understand the risks")');
  if (await understandBtn.isVisible().catch(() => false)) {
    await understandBtn.click();
    await page.waitForTimeout(800);
  }
}

export async function closePositionViaUI(page: Page) {
  const posPanel = page.locator(".card-surface").filter({ hasText: "Your Position" });
  await posPanel.locator("text=Close Position").first().click();
  await page.waitForTimeout(500);
}
