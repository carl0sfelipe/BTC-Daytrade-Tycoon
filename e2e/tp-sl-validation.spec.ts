import { test, expect, type Page } from "@playwright/test";
import {
  seedOnboardingDone,
  openLongMarketViaUI,
  openShortMarketViaUI,
} from "./_helpers/ui-actions";
import { FLAT_PRICE } from "./_helpers/mock-binance";
import { openPinnedTradingSession } from "./_helpers/engine";

/**
 * Regression: order-validation toasts must render the ENGLISH catalog by
 * default (Loop B i18n debt — pt-BR copy once leaked into lastActionError).
 *
 * The invalid TP/SL is applied on an OPEN position through the PositionPanel
 * editor, so the store validates against the CURRENT price
 * (validateTpSlCurrentPrice) — price is pinned at FLAT_PRICE by the mock.
 */

const INVALID_OFFSET = 1_000;

/** Open a 10x / 50% market position through the real trade controls. */
async function openMarketPositionViaControls(page: Page, side: "long" | "short"): Promise<void> {
  const openViaUI = side === "long" ? openLongMarketViaUI : openShortMarketViaUI;
  await openViaUI(page, { leverage: 10, sizePercent: 50 });
}

/** Fill the PositionPanel TP or SL editor and apply the given trigger price. */
async function applyTpSlViaPositionPanel(
  page: Page,
  kind: "tp" | "sl",
  triggerPrice: number
): Promise<void> {
  await page.getByTestId(`position-panel-${kind}-toggle`).click();
  await page.getByTestId(`position-panel-${kind}-input`).fill(String(triggerPrice));
  await page.getByTestId(`position-panel-${kind}-apply`).click();
}

/** Assert the destructive toast copy is English and free of pt-BR words. */
async function expectEnglishValidationToast(
  page: Page,
  headline: RegExp,
  direction: "ABOVE" | "BELOW"
): Promise<void> {
  const viewport = page.getByTestId("toast-viewport");
  await expect(viewport.getByText(headline)).toBeVisible();

  const toastText = await viewport.innerText();
  expect(toastText).toContain("Invalid");
  expect(toastText).toContain(direction);
  expect(toastText).not.toMatch(/inv[aá]lido/i);
  expect(toastText).not.toMatch(/informe/i);
  expect(toastText).not.toMatch(/acima|abaixo/i);
}

test.describe("TP/SL validation messages are in English", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    await seedOnboardingDone(page);
    await openPinnedTradingSession(page);
  });

  test("invalid TP below price for LONG shows English error", async ({ page }) => {
    await openMarketPositionViaControls(page, "long");

    await applyTpSlViaPositionPanel(page, "tp", FLAT_PRICE - INVALID_OFFSET);

    await expectEnglishValidationToast(page, /Invalid TP:/, "ABOVE");
  });

  test("invalid SL above price for LONG shows English error", async ({ page }) => {
    await openMarketPositionViaControls(page, "long");

    await applyTpSlViaPositionPanel(page, "sl", FLAT_PRICE + INVALID_OFFSET);

    await expectEnglishValidationToast(page, /Invalid SL:/, "BELOW");
  });

  test("invalid TP above price for SHORT shows English error", async ({ page }) => {
    await openMarketPositionViaControls(page, "short");

    await applyTpSlViaPositionPanel(page, "tp", FLAT_PRICE + INVALID_OFFSET);

    await expectEnglishValidationToast(page, /Invalid TP:/, "BELOW");
  });
});
