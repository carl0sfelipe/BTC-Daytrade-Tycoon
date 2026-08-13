import { test, expect, type Page } from "@playwright/test";
import { saveEvidence } from "./_helper";
import { seedOnboardingDone } from "./_helpers/ui-actions";
import { openPinnedTradingSession, type E2EBridgeWindow } from "./_helpers/engine";

const JID = "LEV-TRAIL-UI";

/**
 * Trailing-stop UI restored after refactor 3193d78 dropped it: the control
 * lives in trade-controls/TrailingStopControl and only renders with an open
 * position outside reduce mode. Stable selectors: trailing-stop-input,
 * trailing-stop-set, trailing-stop-remove.
 */

function readPositionLeverage(page: Page) {
  return page.evaluate(() => {
    const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
      position: { leverage: number; size: number } | null;
    };
    return s.position && { leverage: s.position.leverage, size: s.position.size };
  });
}

test.describe("Leverage and Trailing Stop via UI", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("leverage pill applies to the open position when the next order executes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses store injection for setup");

    await openPinnedTradingSession(page, undefined, { skipHighLeverageWarning: true });

    // Open a position at 10x via store
    await page.evaluate(() => {
      const store = (window as E2EBridgeWindow).__tradingStore!;
      (store.getState() as {
        openPosition: (side: string, lev: number, size: number, tp: string, sl: string, limit: null) => void;
      }).openPosition("long", 10, 1000, "", "", null);
    });
    await expect.poll(() => readPositionLeverage(page)).toEqual({ leverage: 10, size: 1000 });

    // Clicking the 25x pill only arms the controls. The store position is NOT
    // touched yet — deliberate product behavior: applying it immediately would
    // move the liquidation line before any order executes (see the
    // handleUpdate/handleOpen comment in TradeControls.tsx).
    const leveragePill = page.getByRole("radio", { name: "25x leverage" });
    await leveragePill.click();
    await expect(leveragePill).toBeChecked();
    expect(await readPositionLeverage(page)).toEqual({ leverage: 10, size: 1000 });

    // Executing the next order (increase by the armed $1000) applies 25x
    await page.getByTestId("trade-controls-action-btn").click();
    await expect.poll(() => readPositionLeverage(page)).toEqual({ leverage: 25, size: 2000 });

    await saveEvidence(page, JID, "01-leverage-updated");
  });

  test("trailing stop Set button is disabled for values over 20", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses store injection for setup");

    await openPinnedTradingSession(page, undefined, { skipHighLeverageWarning: true });
    await page.evaluate(() => {
      const store = (window as E2EBridgeWindow).__tradingStore!;
      (store.getState() as {
        openPosition: (side: string, lev: number, size: number, tp: string, sl: string, limit: null) => void;
      }).openPosition("long", 10, 1000, "", "", null);
    });

    // Type invalid value (> 20) into trailing stop input
    const tsInput = page.getByTestId("trailing-stop-input");
    await tsInput.fill("25");

    // Set button must be disabled (bug B2 regression in E2E)
    const setBtn = page.getByTestId("trailing-stop-set");
    await expect(setBtn).toBeDisabled();

    await saveEvidence(page, JID, "02-trailing-disabled-over-20");
  });

  test("trailing stop Set and Remove flow updates store via UI", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses store injection for setup");

    await openPinnedTradingSession(page, undefined, { skipHighLeverageWarning: true });
    await page.evaluate(() => {
      const store = (window as E2EBridgeWindow).__tradingStore!;
      (store.getState() as {
        openPosition: (side: string, lev: number, size: number, tp: string, sl: string, limit: null) => void;
      }).openPosition("long", 10, 1000, "", "", null);
    });

    // Type valid trailing stop value and click Set
    const tsInput = page.getByTestId("trailing-stop-input");
    await tsInput.fill("5");
    const setBtn = page.getByTestId("trailing-stop-set");
    await expect(setBtn).toBeEnabled();
    await setBtn.click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
            position: { trailingStopPercent: number | null } | null;
          };
          return s.position?.trailingStopPercent;
        })
      )
      .toBe(5);

    // Remove clears it
    const removeBtn = page.getByTestId("trailing-stop-remove");
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const s = (window as E2EBridgeWindow).__tradingStore!.getState() as {
            position: { trailingStopPercent: number | null } | null;
          };
          return s.position?.trailingStopPercent;
        })
      )
      .toBeNull();

    await saveEvidence(page, JID, "03-trailing-set-remove");
  });
});
