import { test, expect, type Page } from "@playwright/test";
import { saveEvidence, captureConsoleLogs } from "./_helper";
import { seedOnboardingDone } from "./_helpers/ui-actions";
import { FLAT_PRICE } from "./_helpers/mock-binance";
import { openPinnedTradingSession } from "./_helpers/engine";

const JID = "CALLED-SHOT";

// Flat mocked candles keep every tick at the entry price, so the +3% pill
// lands on an exact target and the reward is a fixed number:
// round(2.5 × √(3 × 10)) = 14 (diamond-reward.ts).
const ENTRY_PRICE = FLAT_PRICE;
const TARGET_PRICE = 51_500;
const SL_PRICE = 48_500;
const PLUS3_AT_10X_REWARD = 14;

/** Slice of the trading store this spec reads/drives through the E2E bridge. */
interface CalledShotStoreProbe {
  currentPrice: number;
  diamonds: number;
  callStreak: number;
  position: { tpPrice: number | null } | null;
  activeCall: { targetPrice: number; targetPercent: number; potentialReward: number } | null;
  lastCallResult: { outcome: string; reward: number; streak: number } | null;
  closedTrades: Array<{ reason: string }>;
  checkPosition: (price: number) => { closed: boolean };
  setPositionTpSl: (tpPrice: string, slPrice: string) => void;
}

type E2EWindow = Window & {
  __timewarpEngine?: { pause: () => void };
  __tradingStore?: {
    getState: () => CalledShotStoreProbe;
    setState: (patch: Record<string, unknown>) => void;
  };
};

async function openPinnedGuestTradingSession(page: Page): Promise<void> {
  // Pause/pin caveats (auto-start anchor, StrictMode revival, session-load
  // wipe) live in the shared helper docstrings (e2e/_helpers/engine.ts).
  await openPinnedTradingSession(page, ENTRY_PRICE, {
    diamonds: 0,
    callStreak: 0,
    diamondsThisRun: 0,
    lastRewardedCallAt: null,
    activeCall: null,
    lastCallResult: null,
    runCallLog: [],
  });
}

/** Belt and suspenders: the entry must still be pinned when the order fires. */
async function expectPricePinnedAtEntry(page: Page): Promise<void> {
  const price = await page.evaluate(
    () => (window as E2EWindow).__tradingStore!.getState().currentPrice
  );
  expect(price).toBe(ENTRY_PRICE);
}

/**
 * Arm the +3% pill and open a LONG 10x market order — declares the call.
 * `beforeOpen` runs after arming and before the order, for scenario-specific
 * assertions on the armed-but-undeclared state.
 */
async function armPlusThreePillAndOpenLong(
  page: Page,
  beforeOpen?: () => Promise<void>
): Promise<void> {
  await page.click("text=LONG");
  await page.getByRole("radio", { name: "10x leverage" }).click();
  await page.getByRole("button", { name: "+3%", exact: true }).click();
  await expect(page.getByText(`${PLUS3_AT_10X_REWARD} 💎 if it hits`)).toBeVisible();
  if (beforeOpen) await beforeOpen();
  await page.locator('button:has-text("50%")').click();
  await expectPricePinnedAtEntry(page);
  await page.click('button:has-text("Open Long")');
  await expect(calledShotStatusChip(page)).toBeVisible();
}

function calledShotStatusChip(page: Page) {
  return page.getByTestId("called-shot-status");
}

function diamondCounterValue(page: Page) {
  return page.getByTestId("diamond-counter-value");
}

/** Toast lookup scoped to the viewport — the Radix screen-reader announcer
 *  duplicates the text outside it and would break strict mode. */
function toastWithText(page: Page, pattern: RegExp) {
  return page.getByTestId("toast-viewport").getByText(pattern);
}

function readCalledShotProbe(page: Page) {
  return page.evaluate(() => {
    const w = window as E2EWindow;
    const s = w.__tradingStore!.getState();
    return {
      hasPosition: !!s.position,
      activeCallTarget: s.activeCall?.targetPrice ?? null,
      activeCallReward: s.activeCall?.potentialReward ?? null,
      diamonds: s.diamonds,
      callStreak: s.callStreak,
      lastOutcome: s.lastCallResult?.outcome ?? null,
      lastReward: s.lastCallResult?.reward ?? null,
      lastCloseReason: s.closedTrades[s.closedTrades.length - 1]?.reason ?? null,
    };
  });
}

/** Deterministic price move: pin the price and run the TP/SL check once. */
async function driveMarketPriceTo(page: Page, price: number): Promise<void> {
  await page.evaluate((p) => {
    const w = window as E2EWindow;
    w.__tradingStore!.setState({ currentPrice: p, price: p });
    w.__tradingStore!.getState().checkPosition(p);
  }, price);
}

test.describe("Called Shot E2E", () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDone(page);
  });

  test("declaring a +3% called shot on a market long shows the live status chip", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    const { startCapture, saveLogs } = captureConsoleLogs(page, JID);
    startCapture();
    await openPinnedGuestTradingSession(page);

    await armPlusThreePillAndOpenLong(page, async () => {
      // Arming the pill alone is not a declaration — no chip before the order.
      // No saveEvidence here: a fullPage screenshot mid-flow intermittently
      // remounts the trade controls and wipes the armed (React-local) TP,
      // so evidence is only captured after the order settles.
      await expect(calledShotStatusChip(page)).toBeHidden();
    });

    // The picker disarms with a position open; the chip carries the live call.
    await expect(page.getByRole("button", { name: "+3%", exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "No call", exact: true })).toBeHidden();
    await saveEvidence(page, JID, "02-call-declared");

    const probe = await readCalledShotProbe(page);
    expect(probe.hasPosition).toBe(true);
    expect(probe.activeCallTarget).toBe(TARGET_PRICE);
    expect(probe.activeCallReward).toBe(PLUS3_AT_10X_REWARD);
    expect(probe.diamonds).toBe(0);
    await saveLogs("declaring");
  });

  test("closing manually before the target voids the called shot without payout", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    await openPinnedGuestTradingSession(page);
    await armPlusThreePillAndOpenLong(page);

    const posPanel = page.locator(".card-surface").filter({ hasText: "Your Position" });
    await posPanel.locator("text=Close Position").first().click();

    await expect(toastWithText(page, /Called shot voided/i)).toBeVisible();
    await expect(calledShotStatusChip(page)).toBeHidden();
    await expect(diamondCounterValue(page)).toHaveText("0");
    await saveEvidence(page, JID, "03-call-voided");

    const probe = await readCalledShotProbe(page);
    expect(probe.hasPosition).toBe(false);
    expect(probe.lastOutcome).toBe("voided");
    expect(probe.lastReward).toBe(0);
    expect(probe.diamonds).toBe(0);
    expect(probe.lastCloseReason).toBe("manual");
  });

  test("price crossing the +3% target resolves the call as hit and pays diamonds", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    await openPinnedGuestTradingSession(page);
    await armPlusThreePillAndOpenLong(page);
    await expect(diamondCounterValue(page)).toHaveText("0");

    await driveMarketPriceTo(page, TARGET_PRICE);

    // Store first: the hit is confirmed race-free before any UI window closes.
    const probe = await readCalledShotProbe(page);
    expect(probe.hasPosition).toBe(false);
    expect(probe.lastCloseReason).toBe("tp");
    expect(probe.lastOutcome).toBe("hit");
    expect(probe.lastReward).toBe(PLUS3_AT_10X_REWARD);
    expect(probe.diamonds).toBe(PLUS3_AT_10X_REWARD);
    expect(probe.callStreak).toBe(1);

    // DiamondBurst banner only lives ~1.4s — soft, so a slow frame cannot
    // flake the run; the toast and counter below are the hard UI evidence.
    await expect.soft(page.getByText(`+${PLUS3_AT_10X_REWARD} 💎`, { exact: true })).toBeVisible();
    await expect(toastWithText(page, new RegExp(`CALLED SHOT! \\+${PLUS3_AT_10X_REWARD}`))).toBeVisible();
    await expect(diamondCounterValue(page)).toHaveText(String(PLUS3_AT_10X_REWARD));
    await expect(calledShotStatusChip(page)).toBeHidden();
    await saveEvidence(page, JID, "04-call-hit");
  });

  test("stop loss before the target resolves the call as missed and resets streak", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "production", "Uses __tradingStore injection");
    await openPinnedGuestTradingSession(page);
    await armPlusThreePillAndOpenLong(page);

    // Adding an SL without touching the TP must keep the call alive.
    await page.evaluate((sl) => {
      const w = window as E2EWindow;
      w.__tradingStore!.getState().setPositionTpSl("", String(sl));
    }, SL_PRICE);
    await expect(calledShotStatusChip(page)).toBeVisible();

    await driveMarketPriceTo(page, SL_PRICE);

    await expect(toastWithText(page, /Called shot missed/i)).toBeVisible();
    await expect(calledShotStatusChip(page)).toBeHidden();
    await expect(diamondCounterValue(page)).toHaveText("0");
    await saveEvidence(page, JID, "05-call-missed");

    const probe = await readCalledShotProbe(page);
    expect(probe.hasPosition).toBe(false);
    expect(probe.lastCloseReason).toBe("sl");
    expect(probe.lastOutcome).toBe("missed");
    expect(probe.lastReward).toBe(0);
    expect(probe.diamonds).toBe(0);
    expect(probe.callStreak).toBe(0);
  });
});
