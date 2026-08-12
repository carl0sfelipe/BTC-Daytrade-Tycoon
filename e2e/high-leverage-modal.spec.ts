import { test, expect, type Page } from "@playwright/test";
import { saveEvidence, saveViewportEvidence, captureConsoleLogs } from "./_helper";
import { seedOnboardingDone, closePositionViaUI } from "./_helpers/ui-actions";
import { openPinnedTradingSession } from "./_helpers/engine";

const JID = "HIGH-LEV-MODAL";

/**
 * The default session caps leverage at 50x (sessionSlice maxLeverage), so 50x
 * is both the highest pill on screen AND the modal threshold
 * (ConfirmHighLeverageModal shows for leverage >= 50).
 */
async function armLong50x(page: Page): Promise<void> {
  const longTab = page.getByTestId("trade-controls-side-long");
  await longTab.click();
  await expect(longTab).toHaveClass(/bg-crypto-long/);

  const leveragePill = page.getByRole("radio", { name: "50x leverage" });
  await leveragePill.click();
  await expect(leveragePill).toBeChecked();

  const sizePill = page.getByRole("radio", { name: "50% position size" });
  await sizePill.click();
  await expect(sizePill).toBeChecked();
}

test.describe("High Leverage Warning Modal", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("≥50x leverage shows confirmation modal in simple mode", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page, undefined, { skipHighLeverageWarning: false });
    await armLong50x(page);

    // Submitting at 50x must pop the warning modal, not open the position
    await page.getByTestId("trade-controls-action-btn").click();
    const confirmBtn = page.getByTestId("high-leverage-confirm");
    await expect(confirmBtn).toBeVisible();
    // 100/leverage: at 50x a 2.00% adverse move liquidates
    await expect(page.getByTestId("high-leverage-risk-pct")).toHaveText("2.00%");
    // Viewport-only: the modal rides React-local pendingTrade state, and a
    // fullPage screenshot's viewport resize can remount the controls and
    // dismiss it before the confirm click below.
    await saveViewportEvidence(page, JID, "01-modal-appears");

    // Confirm → position opens
    await confirmBtn.click();
    await expect(page.getByTestId("position-panel-pnl")).toBeVisible();
    await saveEvidence(page, JID, "02-after-confirm");

    await closePositionViaUI(page);
    await saveLogs("modal-simple");
  });

  test("modal does not appear when skip flag is set", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();

    await openPinnedTradingSession(page, undefined, { skipHighLeverageWarning: true });
    await armLong50x(page);

    // Submit WITHOUT any confirm click: the PnL can only appear if no dialog
    // interposed, which is exactly what the skip flag promises.
    await page.getByTestId("trade-controls-action-btn").click();
    await expect(page.getByTestId("position-panel-pnl")).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await saveEvidence(page, JID, "03-no-modal");

    await closePositionViaUI(page);
    await saveLogs("skip-flag");
  });
});
