import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TradeControls from "./TradeControls";
import { useTradingStore } from "@/store/tradingStore";

vi.mock("./ConfirmHighLeverageModal", () => ({
  default: () => null,
}));

describe("TradeControls", () => {
  beforeEach(() => {
    useTradingStore.setState({
      wallet: 10000,
      position: null,
      currentPrice: 50000,
      skipHighLeverageWarning: true,
      pendingOrders: [],
      closedTrades: [],
      reduceOnly: true,
    });
  });

  it("shows Limit Price input in simple mode when limit is selected", () => {
    render(<TradeControls />);

    // Switch to limit order
    const limitBtn = screen.getByText("Limit");
    fireEvent.click(limitBtn);

    // Should show Limit Price label and input
    expect(screen.getByText("Limit Price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("50000.00")).toBeInTheDocument();
  });

  it("shows TP and SL inputs in simple mode when no position", () => {
    render(<TradeControls />);

    expect(screen.getByText("Take Profit")).toBeInTheDocument();
    expect(screen.getByText("Stop Loss")).toBeInTheDocument();
  });

  it("creates a pending limit order instead of opening position immediately", () => {
    render(<TradeControls />);

    // Select limit
    fireEvent.click(screen.getByText("Limit"));

    // Fill limit price
    const limitInput = screen.getByPlaceholderText("50000.00");
    fireEvent.change(limitInput, { target: { value: "48000" } });

    // Fill TP
    const tpInput = screen.getAllByPlaceholderText("0.00")[0];
    fireEvent.change(tpInput, { target: { value: "55000" } });

    // Open position button should say "Place Long Limit"
    const openBtn = screen.getByText("Place Long Limit");
    fireEvent.click(openBtn);

    const state = useTradingStore.getState();
    expect(state.pendingOrders).toHaveLength(1);
    expect(state.pendingOrders[0].limitPrice).toBe(48000);
    expect(state.pendingOrders[0].tpPrice).toBe(55000);
    expect(state.position).toBeNull(); // Position NOT opened yet
    expect(state.wallet).toBe(10000); // Margin NOT deducted yet
  });

  it("opens market position immediately when market is selected", () => {
    render(<TradeControls />);

    const openBtn = screen.getByText("Open Long");
    fireEvent.click(openBtn);

    const state = useTradingStore.getState();
    expect(state.position).not.toBeNull();
    expect(state.pendingOrders).toHaveLength(0);
  });

  it("fills limit price with current price on click when empty", () => {
    render(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000.00") as HTMLInputElement;

    expect(limitInput.value).toBe("");
    fireEvent.click(limitInput);
    expect(limitInput.value).toBe("50000.00");
  });

  it("adjusts limit price up and down with step buttons", () => {
    render(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000.00") as HTMLInputElement;
    fireEvent.click(limitInput); // fill with 50000

    expect(limitInput.value).toBe("50000.00");

    // Default step is $10 — click down
    const downBtn = screen.getAllByRole("button").find((b) => b.querySelector("svg")?.classList.contains("lucide-chevron-down"));
    const upBtn = screen.getAllByRole("button").find((b) => b.querySelector("svg")?.classList.contains("lucide-chevron-up"));

    expect(downBtn).toBeDefined();
    expect(upBtn).toBeDefined();

    fireEvent.click(downBtn!);
    expect(limitInput.value).toBe("49990.00");

    fireEvent.click(upBtn!);
    fireEvent.click(upBtn!);
    expect(limitInput.value).toBe("50010.00");
  });

  it("shows step settings on gear icon click and hides by default", () => {
    render(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));

    // Step buttons hidden by default
    expect(screen.queryByText("$1")).not.toBeInTheDocument();

    // Click gear icon
    const gearBtn = screen.getByLabelText("Step settings");
    fireEvent.click(gearBtn);

    // Step buttons now visible
    expect(screen.getByText("$1")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
  });

  it("changes step size via hidden step selector buttons", () => {
    render(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000.00") as HTMLInputElement;
    fireEvent.click(limitInput);

    // Open step settings
    fireEvent.click(screen.getByLabelText("Step settings"));

    // Select $10 step
    fireEvent.click(screen.getByText("$10"));

    const downBtn = screen.getAllByRole("button").find((b) => b.querySelector("svg")?.classList.contains("lucide-chevron-down"));
    fireEvent.click(downBtn!);

    expect(limitInput.value).toBe("49990.00");
  });

  it("allows custom step value", () => {
    render(<TradeControls />);

    fireEvent.click(screen.getByText("Limit"));
    const limitInput = screen.getByPlaceholderText("50000.00") as HTMLInputElement;
    fireEvent.click(limitInput);

    // Open step settings
    fireEvent.click(screen.getByLabelText("Step settings"));

    // Type custom step
    const customInput = screen.getByPlaceholderText("e.g. 25");
    fireEvent.change(customInput, { target: { value: "25" } });

    const downBtn = screen.getAllByRole("button").find((b) => b.querySelector("svg")?.classList.contains("lucide-chevron-down"));
    fireEvent.click(downBtn!);

    expect(limitInput.value).toBe("49975.00");
  });

  describe("order-centric slider (positionSize = order delta, not total)", () => {
    const openLong5k = () =>
      useTradingStore.setState({
        wallet: 10000,
        position: {
          side: "long",
          entry: 50000,
          size: 5000,
          leverage: 10,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: 45000,
          entryTime: "2026-05-04T12:00:00Z",
          realizedPnL: 0,
        },
        currentPrice: 50000,
        skipHighLeverageWarning: true,
        pendingOrders: [],
        closedTrades: [],
      });

    it("INCREASE label shows whenever side === position.side", () => {
      openLong5k();
      render(<TradeControls />);

      // Default: side=long, position=long → INCREASE
      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
    });

    it("REDUCE label shows whenever side !== position.side", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));
      expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();
      expect(screen.queryByText("INCREASE POSITION")).not.toBeInTheDocument();
    });

    it("toggles INCREASE/REDUCE when clicking LONG → SHORT → LONG", () => {
      openLong5k();
      render(<TradeControls />);

      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();

      fireEvent.click(screen.getByText("SHORT"));
      expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();

      fireEvent.click(screen.getByText("LONG"));
      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
    });

    it("allows INCREASE order smaller than current position size (the reported bug)", () => {
      // User has long $5000, wants to add only $200 more.
      // Old behavior: slider as total → must drag to $5200 to increase.
      // New behavior: slider as order size → set slider to $200, click INCREASE.
      openLong5k();
      render(<TradeControls />);

      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "200" } });

      const increaseBtn = screen.getByText("INCREASE POSITION");
      expect(increaseBtn).not.toBeDisabled();
      fireEvent.click(increaseBtn);

      // Position should now be 5200
      expect(useTradingStore.getState().position?.size).toBe(5200);
    });

    it("REDUCE applies the order size as a delta from position.size", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "300" } });

      fireEvent.click(screen.getByText("REDUCE POSITION"));

      // Position should now be 5000 - 300 = 4700
      expect(useTradingStore.getState().position?.size).toBe(4700);
    });

    it("REDUCE slider max is capped at position.size in reduce only mode", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      // sliderMax in REDUCE = position.size = 5000
      expect(slider.max).toBe("5000");
    });

    it("hedge mode: slider max allows orders larger than position.size", () => {
      useTradingStore.setState({
        wallet: 10000,
        position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000, tpPrice: null, slPrice: null, entryTime: "now", realizedPnL: 0 },
        currentPrice: 50000,
        reduceOnly: false,
      });
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      // In hedge mode opposite side: position.size (1000) + wallet * leverage (100000) = 101000
      expect(slider.max).toBe("101000");
    });

    it("INCREASE slider max scales with wallet and leverage", () => {
      openLong5k();
      render(<TradeControls />);

      const slider = screen.getByRole("slider") as HTMLInputElement;
      // INCREASE: wallet (10000) * leverage (10) = 100000
      expect(slider.max).toBe("100000");
    });

    it("snaps to default $1000 order size on side click", () => {
      openLong5k();
      render(<TradeControls />);

      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "3000" } });
      expect(slider.value).toBe("3000");

      fireEvent.click(screen.getByText("SHORT"));
      expect(slider.value).toBe("1000");

      fireEvent.click(screen.getByText("LONG"));
      expect(slider.value).toBe("1000");
    });

    it("REDUCE equal to full position size closes the position", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "5000" } });

      fireEvent.click(screen.getByText("REDUCE POSITION"));

      // Position should be closed
      expect(useTradingStore.getState().position).toBeNull();
      // Should have a closed trade
      expect(useTradingStore.getState().closedTrades).toHaveLength(1);
    });

    it("REDUCE with max slider value closes the position", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      // slider max in reduce mode = position.size = 5000
      fireEvent.change(slider, { target: { value: slider.max } });

      fireEvent.click(screen.getByText("REDUCE POSITION"));

      // Position should be closed
      expect(useTradingStore.getState().position).toBeNull();
    });

    it("caps initial slider to position size when position is smaller than $1000", () => {
      useTradingStore.setState({
        wallet: 10000,
        position: {
          side: "long",
          entry: 50000,
          size: 500,
          leverage: 10,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: 45000,
          entryTime: "2026-05-04T12:00:00Z",
          realizedPnL: 0,
        },
        currentPrice: 50000,
        skipHighLeverageWarning: true,
      });
      render(<TradeControls />);

      const slider = screen.getByRole("slider") as HTMLInputElement;
      expect(slider.value).toBe("500");
    });

    it("shows CLOSE POSITION button in limit mode with open position", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("Limit"));
      expect(screen.getByText("CLOSE POSITION")).toBeInTheDocument();
    });

    it("limit order with open position creates pending order instead of market reduce", () => {
      openLong5k();
      render(<TradeControls />);

      // Switch to SHORT side (reduce) + Limit
      fireEvent.click(screen.getByText("SHORT"));
      fireEvent.click(screen.getByText("Limit"));

      // Fill limit price
      const limitInput = screen.getByPlaceholderText("50000.00") as HTMLInputElement;
      fireEvent.change(limitInput, { target: { value: "48000" } });

      // Click the Place Short Limit button
      fireEvent.click(screen.getByText("Place Short Limit"));

      const state = useTradingStore.getState();
      // Should create a pending order, NOT immediately reduce
      expect(state.pendingOrders).toHaveLength(1);
      expect(state.pendingOrders[0].side).toBe("short");
      expect(state.pendingOrders[0].limitPrice).toBe(48000);
      // Position should remain unchanged
      expect(state.position).not.toBeNull();
      expect(state.position!.size).toBe(5000);
    });

    it("limit order with open position (same side) creates pending increase order", () => {
      openLong5k();
      render(<TradeControls />);

      // Stay on LONG side + Limit
      fireEvent.click(screen.getByText("Limit"));

      // Fill limit price
      const limitInput = screen.getByPlaceholderText("50000.00") as HTMLInputElement;
      fireEvent.change(limitInput, { target: { value: "52000" } });

      // Click the Place Long Limit button
      fireEvent.click(screen.getByText("Place Long Limit"));

      const state = useTradingStore.getState();
      expect(state.pendingOrders).toHaveLength(1);
      expect(state.pendingOrders[0].side).toBe("long");
      expect(state.pendingOrders[0].limitPrice).toBe(52000);
      expect(state.position).not.toBeNull();
      expect(state.position!.size).toBe(5000);
    });

    it("shows TP/SL inputs in advanced mode with open position + limit selected", () => {
      openLong5k();
      render(<TradeControls />);

      // Switch to advanced mode
      fireEvent.click(screen.getByText("Advanced Mode"));
      fireEvent.click(screen.getByText("Limit"));

      expect(screen.getByText("Take Profit")).toBeInTheDocument();
      expect(screen.getByText("Stop Loss")).toBeInTheDocument();
    });

    it("INCREASE recalculates liquidation price after adding to position", () => {
      openLong5k();
      render(<TradeControls />);

      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "5000" } });

      fireEvent.click(screen.getByText("INCREASE POSITION"));

      const pos = useTradingStore.getState().position;
      expect(pos).not.toBeNull();
      // New entry should be weighted average: (5000*50000 + 5000*50000) / 10000 = 50000
      // But liquidation price should still be recalculated
      expect(pos!.liquidationPrice).not.toBeNull();
    });

    // ─── Mutation Test 1 ──────────────────────────────────────────────
    // If the useEffect re-introduces the bug of always syncing side to
    // position.side on every position update, this test fails.
    it("mutant: side stays on user-selected opposite side after position updates", () => {
      useTradingStore.setState({
        wallet: 10000,
        position: {
          side: "short",
          entry: 50000,
          size: 2000,
          leverage: 10,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: 55000,
          entryTime: "2026-05-04T12:00:00Z",
          realizedPnL: 0,
        },
        currentPrice: 50000,
        reduceOnly: false,
        skipHighLeverageWarning: true,
      });
      render(<TradeControls />);

      // User clicks LONG (opposite side) to flip
      fireEvent.click(screen.getByText("LONG"));

      // LONG button should be active (selected) — find the actual <button>
      const longBtn = screen.getAllByText("LONG").find(
        (el) => el.tagName.toLowerCase() === "button"
      )!;
      expect(longBtn.className).toContain("bg-crypto-long");

      // Simulate a position update (e.g. price tick creates new position object)
      const currentPos = useTradingStore.getState().position!;
      useTradingStore.setState({
        position: { ...currentPos, entryTime: "2026-05-04T12:00:01Z" },
      });

      // After re-render, LONG must STILL be selected — not reset back to SHORT
      const longBtnAfter = screen.getAllByText("LONG").find(
        (el) => el.tagName.toLowerCase() === "button"
      )!;
      expect(longBtnAfter.className).toContain("bg-crypto-long");

      // And the action button should reflect the chosen side (any opposite-side label)
      const actionLabel = screen.getByText(/FLIP TO LONG|REDUCE POSITION/);
      expect(actionLabel).toBeInTheDocument();
    });

    // ─── Mutation Test 2 ──────────────────────────────────────────────
    // If the action button reverts to always showing "REDUCE POSITION"
    // when side != position.side (ignoring Hedge Mode), this test fails.
    it("mutant: hedge mode shows FLIP label and enables button for sizes > position", () => {
      useTradingStore.setState({
        wallet: 10000,
        position: {
          side: "short",
          entry: 50000,
          size: 2000,
          leverage: 10,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: 55000,
          entryTime: "2026-05-04T12:00:00Z",
          realizedPnL: 0,
        },
        currentPrice: 50000,
        reduceOnly: false,
        skipHighLeverageWarning: true,
      });
      render(<TradeControls />);

      // Click LONG to flip from SHORT
      fireEvent.click(screen.getByText("LONG"));

      // Set slider to a value LARGER than current position (flip with excess)
      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "5000" } });

      // Button must say "FLIP TO LONG", never "REDUCE POSITION"
      const actionBtn = screen.getByText("FLIP TO LONG");
      expect(actionBtn).toBeInTheDocument();
      expect(screen.queryByText("REDUCE POSITION")).not.toBeInTheDocument();

      // Button must be enabled — canFlip only requires size > 0 in hedge mode
      expect(actionBtn).not.toBeDisabled();

      // Execute the flip
      fireEvent.click(actionBtn);

      // Store should now have a LONG position
      const pos = useTradingStore.getState().position;
      expect(pos).not.toBeNull();
      expect(pos!.side).toBe("long");
    });

    it("mutant: hedge mode reduce (size < position) still shows REDUCE, not FLIP", () => {
      useTradingStore.setState({
        wallet: 10000,
        position: {
          side: "short",
          entry: 50000,
          size: 5000,
          leverage: 10,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: 55000,
          entryTime: "2026-05-04T12:00:00Z",
          realizedPnL: 0,
        },
        currentPrice: 50000,
        reduceOnly: false,
        skipHighLeverageWarning: true,
      });
      render(<TradeControls />);

      fireEvent.click(screen.getByText("LONG"));

      // Size smaller than position → just a reduce, not a flip
      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "2000" } });

      expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();
      expect(screen.queryByText("FLIP TO LONG")).not.toBeInTheDocument();
    });
  });
});
