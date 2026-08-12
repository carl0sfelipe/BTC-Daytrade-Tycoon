import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import {
  makeVolatilityRunCandles,
  volatilityFixtureTimeAt,
} from "@/test/helpers";
import VolatilityEventBanner from "./VolatilityEventBanner";

// One 45-candle cluster → one deterministic window at indices 300..344
// (verified in volatility-events.test.ts). 1 candle = 1 real second.
const CANDLES = makeVolatilityRunCandles(700, [
  { start: 300, length: 45, rangePercent: 0.8 },
]);

function renderBannerAtIndex(candleIndex: number) {
  return render(
    <VolatilityEventBanner
      candles={CANDLES}
      currentTimeSec={volatilityFixtureTimeAt(candleIndex)}
    />
  );
}

describe("VolatilityEventBanner", () => {
  beforeEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("renders nothing outside any event window", () => {
    renderBannerAtIndex(280);
    expect(screen.queryByTestId("volatility-event-banner")).toBeNull();
  });

  it("shows the pulsing countdown during the incoming phase", () => {
    renderBannerAtIndex(293);
    const banner = screen.getByTestId("volatility-event-banner");
    expect(banner).toHaveAttribute("data-phase", "incoming");
    expect(banner).toHaveTextContent("⚡ Extreme Volatility in 7s");
  });

  it("shows the timer and the bigger-moves hint during the active phase", () => {
    renderBannerAtIndex(315);
    const banner = screen.getByTestId("volatility-event-banner");
    expect(banner).toHaveAttribute("data-phase", "active");
    expect(banner).toHaveTextContent("⚡ EXTREME VOLATILITY — 30s left");
    expect(banner).toHaveTextContent("Bigger moves — bolder calls land");
  });

  it("localizes the incoming countdown in pt-BR", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    renderBannerAtIndex(293);
    expect(screen.getByTestId("volatility-event-banner")).toHaveTextContent(
      "⚡ Volatilidade Extrema em 7s"
    );
  });

  it("localizes the active phase in pt-BR", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    renderBannerAtIndex(315);
    const banner = screen.getByTestId("volatility-event-banner");
    expect(banner).toHaveTextContent("⚡ VOLATILIDADE EXTREMA — faltam 30s");
    expect(banner).toHaveTextContent("Movimentos maiores — calls mais ousadas acertam");
  });
});
