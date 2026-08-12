import { expect, type Page } from "@playwright/test";

export async function seedOnboardingDone(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "trading-storage",
      JSON.stringify({ state: { hasSeenOnboarding: true }, version: 0 })
    );
  });
}

interface MarketOrderOptions {
  leverage: number;
  sizePercent: 10 | 25 | 50 | 100;
}

/**
 * Arm side, leverage and size on the trade controls, waiting for each control
 * to reflect the click (replaces the old fixed 200ms sleeps). Role selectors
 * are exact-match: `button:has-text("10%")` used to collide with the
 * called-shot "+10%" pill (strict mode violation).
 */
async function armMarketOrderControls(
  page: Page,
  side: "long" | "short",
  opts: MarketOrderOptions
): Promise<void> {
  const sideTab = page.getByTestId(`trade-controls-side-${side}`);
  await sideTab.click();
  await expect(sideTab).toHaveClass(side === "long" ? /bg-crypto-long/ : /bg-crypto-short/);

  const leveragePill = page.getByRole("radio", { name: `${opts.leverage}x leverage` });
  await leveragePill.click();
  await expect(leveragePill).toBeChecked();

  const sizePill = page.getByRole("radio", { name: `${opts.sizePercent}% position size` });
  await sizePill.click();
  await expect(sizePill).toBeChecked();
}

/**
 * Click the open button and wait for the position to exist (position panel
 * PnL renders). ≥50x leverage in simple mode pops the high-leverage warning
 * first — click through it when it shows up.
 */
async function submitMarketOrderAndAwaitPosition(page: Page): Promise<void> {
  await page.getByTestId("trade-controls-action-btn").click();

  const understandRisksBtn = page.locator('button:has-text("I understand the risks")');
  const positionPnl = page.getByTestId("position-panel-pnl");
  await expect(understandRisksBtn.or(positionPnl)).toBeVisible();
  if (await understandRisksBtn.isVisible()) {
    await understandRisksBtn.click();
  }
  await expect(positionPnl).toBeVisible();
}

export async function openLongMarketViaUI(
  page: Page,
  opts: MarketOrderOptions
): Promise<void> {
  await armMarketOrderControls(page, "long", opts);
  await submitMarketOrderAndAwaitPosition(page);
}

export async function openShortMarketViaUI(
  page: Page,
  opts: MarketOrderOptions
): Promise<void> {
  await armMarketOrderControls(page, "short", opts);
  await submitMarketOrderAndAwaitPosition(page);
}

export async function closePositionViaUI(page: Page): Promise<void> {
  const posPanel = page.locator(".card-surface").filter({ hasText: "Your Position" });
  await posPanel.locator("text=Close Position").first().click();
  await expect(page.getByTestId("position-panel-empty")).toBeVisible();
}
