import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";
import { renderWithSentinel, openLong5k, openShort5k, resetStore, getSlider } from "@/test/helpers";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls — slider and position labels", () => {
  beforeEach(() => {
    resetStore();
  });

  it("INCREASE label shows whenever side === position.side", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
  });

  it("REDUCE label shows whenever side !== position.side", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();
    expect(screen.queryByText("INCREASE POSITION")).not.toBeInTheDocument();
  });

  it("toggles INCREASE/REDUCE when clicking LONG → SHORT → LONG", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();

    fireEvent.click(screen.getByText("SHORT"));
    expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();

    fireEvent.click(screen.getByText("LONG"));
    expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
  });

  it("allows INCREASE order smaller than current position size (the reported bug)", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const slider = getSlider();
    fireEvent.change(slider, { target: { value: "200" } });

    const increaseBtn = screen.getByText("INCREASE POSITION");
    expect(increaseBtn).not.toBeDisabled();
    fireEvent.click(increaseBtn);

    expect(useTradingStore.getState().position?.size).toBe(5200);
  });

  it("REDUCE applies the order size as a delta from position.size", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.change(getSlider(), { target: { value: "300" } });
    fireEvent.click(screen.getByText("REDUCE POSITION"));

    expect(useTradingStore.getState().position?.size).toBe(4700);
  });

  it("REDUCE slider max is capped at position.size in reduce only mode", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    expect(getSlider().max).toBe("5000");
  });

  it("hedge mode: slider max allows orders larger than position.size", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "long", entry: 50000, size: 1000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "now", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));

    // Hedge mode: position.size (1000) + effectiveWallet * leverage
    // effectiveWallet = wallet (10000) + returnedMargin (100) + closePnl (0) = 10100
    // result = 1000 + 10100 * 10 = 102000
    expect(getSlider().max).toBe("102000");
  });

  it("INCREASE slider max scales with wallet and leverage", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    expect(getSlider().max).toBe("100000");
  });

  it("snaps to default $1000 order size on side click", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const slider = getSlider();
    fireEvent.change(slider, { target: { value: "3000" } });
    expect(slider.value).toBe("3000");

    fireEvent.click(screen.getByText("SHORT"));
    expect(slider.value).toBe("1000");

    fireEvent.click(screen.getByText("LONG"));
    expect(slider.value).toBe("1000");
  });

  it("REDUCE equal to full position size closes the position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.change(getSlider(), { target: { value: "5000" } });
    fireEvent.click(screen.getByText("REDUCE POSITION"));

    expect(useTradingStore.getState().position).toBeNull();
    expect(useTradingStore.getState().closedTrades).toHaveLength(1);
  });

  it("REDUCE with max slider value closes the position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    const slider = getSlider();
    fireEvent.change(slider, { target: { value: slider.max } });
    fireEvent.click(screen.getByText("REDUCE POSITION"));

    expect(useTradingStore.getState().position).toBeNull();
  });

  it("caps initial slider to position size when position is smaller than $1000", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "long", entry: 50000, size: 500, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    expect(getSlider().value).toBe("500");
  });

  it("shows CLOSE POSITION button in limit mode with open position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    expect(screen.getByText("CLOSE POSITION")).toBeInTheDocument();
  });

  it("limit order with open position creates pending order instead of market reduce", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "48000" } });
    fireEvent.click(screen.getByText("Place Short Limit"));

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].side).toBe("short");
    expect(state.pendingOrders[0].limitPrice).toBe(48000);
    expect(state.position).not.toBeNull();
    expect(state.position!.size).toBe(5000);
  });

  it("limit order with open position (same side) creates pending increase order", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "52000" } });
    fireEvent.click(screen.getByText("Place Long Limit"));

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].side).toBe("long");
    expect(state.pendingOrders[0].limitPrice).toBe(52000);
    expect(state.position).not.toBeNull();
    expect(state.position!.size).toBe(5000);
  });

  it("limit reduce in hedge mode enables button when size < position", () => {
    useTradingStore.setState({
      wallet: 10000,
      position: {
        side: "long", entry: 50000, size: 5000, leverage: 10,
        liquidationPrice: 45000, tpPrice: null, slPrice: null,
        trailingStopPercent: null, trailingStopPrice: null,
        entryTime: "2026-05-04T12:00:00Z", entryTimestamp: 0, realizedPnL: 0,
      },
      currentPrice: 50000,
      reduceOnly: false,
      skipHighLeverageWarning: true,
    });
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("SHORT"));
    fireEvent.click(screen.getByText("Limit"));
    fireEvent.change(getSlider(), { target: { value: "2000" } });
    fireEvent.change(screen.getByPlaceholderText("50000"), { target: { value: "48000" } });

    const limitBtn = screen.getByText("Place Short Limit");
    expect(limitBtn).not.toBeDisabled();

    fireEvent.click(limitBtn);
    expect(useTradingStore.getState().pendingOrders).toHaveLength(1);
    expect(useTradingStore.getState().pendingOrders[0].size).toBe(2000);
  });

  it("shows TP/SL inputs in advanced mode with open position + limit selected", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.click(screen.getByText("Advanced Mode"));
    fireEvent.click(screen.getByText("Limit"));
    fireEvent.click(screen.getByRole("button", { name: /Set Take Profit/i }));

    expect(screen.getByText("Trigger Price")).toBeInTheDocument();
    expect(screen.getByText("Order Price")).toBeInTheDocument();
  });

  it("INCREASE recalculates liquidation price after adding to position", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    fireEvent.change(getSlider(), { target: { value: "5000" } });
    fireEvent.click(screen.getByText("INCREASE POSITION"));

    const pos = useTradingStore.getState().position;
    expect(pos).not.toBeNull();
    expect(pos!.liquidationPrice).not.toBeNull();
  });

  it("manual size input updates position size and slider", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2500" } });

    expect(getSlider().value).toBe("2500");
    expect(useTradingStore.getState().position?.size).toBe(5000); // store only updates on button click
  });

  it("manual size input clamps to min 100", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "50" } });

    expect(getSlider().value).toBe("100");
  });

  it("manual size input clamps to max slider value", () => {
    openLong5k();
    renderWithSentinel(<TradeControls />);

    const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "999999" } });

    expect(getSlider().value).toBe(getSlider().max);
  });

  describe("size intent — percent (slider/pill) vs absolute (input)", () => {
    /**
     * The reported bug: clicking MAX or 50% froze a DOLLAR amount.
     * When unrealized PnL moved the slider's max (capacity), the slider's
     * visual position drifted because the absolute value stayed put. The
     * fix: pill clicks and slider drags lock a PERCENTAGE; the dollar
     * amount is re-derived from current capacity on every render.
     * Typing in the input keeps the old absolute behavior so the user can
     * pin an exact dollar size.
     */

    it("slider stays at MAX when capacity grows (unrealized profit increases sliderMax)", () => {
      openLong5k();
      renderWithSentinel(<TradeControls />);

      const slider = getSlider();
      const initialMax = Number(slider.max);
      // Drag to MAX
      fireEvent.change(slider, { target: { value: slider.max } });
      expect(slider.value).toBe(String(initialMax));

      // Simulate unrealized profit: long at 50000, price rises to 55000.
      // calcSliderMax includes unrealizedPnL, so sliderMax should grow.
      act(() => {
        useTradingStore.setState({ currentPrice: 55000 });
      });

      const newSlider = getSlider();
      const newMax = Number(newSlider.max);
      expect(newMax).toBeGreaterThan(initialMax);
      // The crucial assertion: value still equals max (we're locked at 100%).
      expect(newSlider.value).toBe(newSlider.max);
    });

    it("slider stays at 50% (snapped to $100 step) when capacity changes", () => {
      openLong5k();
      renderWithSentinel(<TradeControls />);

      const slider = getSlider();
      const initialMax = Number(slider.max);
      // Drag to half of current max
      const halfTarget = Math.floor(initialMax / 200) * 100; // snap to step
      fireEvent.change(slider, { target: { value: String(halfTarget) } });
      expect(Number(slider.value)).toBe(halfTarget);

      // Capacity grows from PnL
      act(() => {
        useTradingStore.setState({ currentPrice: 55000 });
      });

      const newSlider = getSlider();
      const newMax = Number(newSlider.max);
      const newValue = Number(newSlider.value);
      // Still ~50% of the new max (within one $100 step of rounding error).
      expect(newValue / newMax).toBeCloseTo(0.5, 1);
    });

    it("manually typed dollar amount stays fixed when capacity changes", () => {
      openLong5k();
      renderWithSentinel(<TradeControls />);

      const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "3000" } });
      expect(getSlider().value).toBe("3000");

      // Capacity changes from PnL — the typed value should NOT track it.
      act(() => {
        useTradingStore.setState({ currentPrice: 55000 });
      });

      expect(getSlider().value).toBe("3000");
    });

    it("typing in the input clears a previously locked percentage", () => {
      openLong5k();
      renderWithSentinel(<TradeControls />);

      const slider = getSlider();
      // Lock at MAX via slider
      fireEvent.change(slider, { target: { value: slider.max } });

      // Now type a specific value — this should switch to absolute mode.
      const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "2000" } });
      expect(getSlider().value).toBe("2000");

      // Capacity grows — typed value stays put (not tracking 100% anymore).
      act(() => {
        useTradingStore.setState({ currentPrice: 55000 });
      });

      expect(getSlider().value).toBe("2000");
    });

    it("changing side clears the percent lock (resets to absolute $1000)", () => {
      openLong5k();
      renderWithSentinel(<TradeControls />);

      const slider = getSlider();
      // Lock at MAX
      fireEvent.change(slider, { target: { value: slider.max } });

      // Side click should reset to the default $1000 absolute.
      fireEvent.click(screen.getByText("SHORT"));
      expect(getSlider().value).toBe("1000");

      // And subsequent capacity changes should NOT make the slider jump.
      act(() => {
        useTradingStore.setState({ currentPrice: 55000 });
      });
      expect(getSlider().value).toBe("1000");
    });

    // ── SHORT-POSITION equivalents ────────────────────────────────────────
    // These mirror the LONG tests above but with a SHORT position.
    // calcSliderMax for short same-side increase uses position.entry - currentPrice
    // as priceDiff, so profiting (price falling) grows the sliderMax exactly
    // like rising price grows it for a LONG.

    it("SHORT: slider stays at MAX when capacity grows (unrealized profit increases sliderMax)", () => {
      openShort5k();
      renderWithSentinel(<TradeControls />);

      // usePositionSync fires after mount and sets side="short".
      // Wait for that to settle before interacting.
      const slider = getSlider();
      const initialMax = Number(slider.max);
      // Drag to MAX on the short same-side increase slider.
      fireEvent.change(slider, { target: { value: slider.max } });
      expect(slider.value).toBe(String(initialMax));

      // Price falls → SHORT is in profit → sliderMax grows.
      act(() => {
        useTradingStore.setState({ currentPrice: 45000 });
      });

      const newSlider = getSlider();
      const newMax = Number(newSlider.max);
      expect(newMax).toBeGreaterThan(initialMax);
      // Locked at 100% → value must still equal max.
      expect(newSlider.value).toBe(newSlider.max);
    });

    it("SHORT: slider stays at 50% when capacity changes", () => {
      openShort5k();
      renderWithSentinel(<TradeControls />);

      const slider = getSlider();
      const initialMax = Number(slider.max);
      const halfTarget = Math.floor(initialMax / 200) * 100;
      fireEvent.change(slider, { target: { value: String(halfTarget) } });
      expect(Number(slider.value)).toBe(halfTarget);

      act(() => {
        useTradingStore.setState({ currentPrice: 45000 });
      });

      const newSlider = getSlider();
      const newValue = Number(newSlider.value);
      const newMax = Number(newSlider.max);
      // Still ~50% of new max.
      expect(newValue / newMax).toBeCloseTo(0.5, 1);
    });

    it("SHORT: manually typed value stays fixed when capacity changes", () => {
      openShort5k();
      renderWithSentinel(<TradeControls />);

      const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "3000" } });
      expect(getSlider().value).toBe("3000");

      act(() => {
        useTradingStore.setState({ currentPrice: 45000 });
      });

      // Absolute — should not move.
      expect(getSlider().value).toBe("3000");
    });

    it("SHORT: typing clears a previously locked percentage", () => {
      openShort5k();
      renderWithSentinel(<TradeControls />);

      const slider = getSlider();
      // Lock at MAX
      fireEvent.change(slider, { target: { value: slider.max } });

      const input = screen.getByTestId("trade-controls-size-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "2000" } });
      expect(getSlider().value).toBe("2000");

      act(() => {
        useTradingStore.setState({ currentPrice: 45000 });
      });

      // No longer tracking — stays at typed amount.
      expect(getSlider().value).toBe("2000");
    });

    it("simple-mode 100% pill (no position) tracks wallet*leverage when leverage changes", () => {
      // No position: SizePills is shown. The 100% pill should lock to MAX.
      useTradingStore.setState({
        wallet: 10000,
        position: null,
        currentPrice: 50000,
        skipHighLeverageWarning: true,
      });
      renderWithSentinel(<TradeControls />);

      // Click the 100% pill (rendered as the "100%" radio).
      fireEvent.click(screen.getByRole("radio", { name: /100% position size/i }));

      // Default leverage 10 → MAX = 100000. With no position, only the size
      // slider exists once we switch to advanced mode below.
      fireEvent.click(screen.getByText("Advanced Mode"));
      const sizeSlider = screen.getByTestId("trade-controls-size-slider") as HTMLInputElement;
      expect(sizeSlider.value).toBe("100000");

      // Bumping leverage to 25 via the leverage slider should grow MAX to
      // 250000 and the locked 100% should follow.
      const leverageSlider = screen.getByLabelText(/leverage slider/i) as HTMLInputElement;
      fireEvent.change(leverageSlider, { target: { value: "25" } });

      const sizeSliderAfter = screen.getByTestId("trade-controls-size-slider") as HTMLInputElement;
      expect(sizeSliderAfter.value).toBe(sizeSliderAfter.max);
      expect(Number(sizeSliderAfter.max)).toBe(250000);
    });
  });
});
