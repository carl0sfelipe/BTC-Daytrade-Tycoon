import { expect, type Page } from "@playwright/test";
import { mockBinanceCandles, FLAT_PRICE } from "./mock-binance";

/** Window bridge exposed by useE2EHelpers / tradingStore in dev builds. */
export type E2EBridgeWindow = Window & {
  __timewarpEngine?: { pause: () => void; start?: () => void };
  __tradingStore?: {
    getState: () => Record<string, unknown>;
    setState: (patch: Record<string, unknown>) => void;
  };
};

/**
 * Pause the simulation engine deterministically.
 *
 * The engine auto-starts ~500ms after candles load (useTimewarpEngine.doLoad).
 * Pausing before that would be undone by the pending auto-start, so anchor on
 * the SimulationClock "Pause" button — it only renders while the engine plays.
 *
 * CAVEAT (React StrictMode): dev double-mounts schedule a SECOND auto-start
 * that can revive the tick loop right after this pause. There is no observable
 * event to wait for it, so this helper cannot guarantee the loop stays dead.
 * With flat mocked candles that is harmless — a surviving tick re-writes the
 * pinned price. Tests that FORCE a price away from the mock must self-correct:
 * re-pin the price inside the expect.poll that reads the UI (see the
 * risk-gauge tests in manual-trading.spec.ts).
 *
 * @example await pauseAutoStartedEngine(page);
 */
export async function pauseAutoStartedEngine(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => {
    (window as E2EBridgeWindow).__timewarpEngine?.pause();
  });
}

/**
 * Pin a fresh guest session: wallet $10k, no position, price fixed.
 * Engine must be paused already (see pauseAutoStartedEngine).
 * `extraState` lets feature specs pin additional slices in the same patch
 * (e.g. called-shot pins diamonds/streak counters).
 *
 * @example await pinGuestSessionAtPrice(page, 50_000, { diamonds: 0 });
 */
export async function pinGuestSessionAtPrice(
  page: Page,
  price: number,
  extraState: Record<string, unknown> = {}
): Promise<void> {
  await page.evaluate(({ pinnedPrice, extra }) => {
    (window as E2EBridgeWindow).__tradingStore?.setState({
      wallet: 10_000,
      position: null,
      closedTrades: [],
      currentPrice: pinnedPrice,
      price: pinnedPrice,
      ...extra,
    });
  }, { pinnedPrice: price, extra: extraState });
}

/**
 * Full deterministic session bootstrap: mock Binance flat candles, load
 * /trading, pause the auto-started engine and pin a fresh guest session.
 * The mock also protects against dev-mode double-mounted session loads
 * finishing late and wiping the store mid-test (loadSession → resetStore).
 *
 * @example await openPinnedTradingSession(page); // pinned at FLAT_PRICE
 */
export async function openPinnedTradingSession(
  page: Page,
  price: number = FLAT_PRICE,
  extraState: Record<string, unknown> = {}
): Promise<void> {
  await mockBinanceCandles(page);
  await page.goto("/trading");
  await page.waitForSelector("text=Simulation Time", { timeout: 30_000 });
  await pauseAutoStartedEngine(page);
  await pinGuestSessionAtPrice(page, price, extraState);
}
