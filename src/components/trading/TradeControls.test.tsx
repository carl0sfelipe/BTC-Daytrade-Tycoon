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

  describe("market mode action button follows side, not size", () => {
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

    it("shows INCREASE when side matches position.side, regardless of slider value", () => {
      openLong5k();
      render(<TradeControls />);

      // Slider initially at position.size (5000), sizeDiff = 0
      // Old behavior would show no button; new behavior shows INCREASE
      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();

      // Drag slider BELOW position.size — old behavior would flip to REDUCE
      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "3000" } });

      // Still INCREASE because side is still long (matches position)
      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
      expect(screen.queryByText("REDUCE POSITION")).not.toBeInTheDocument();
    });

    it("shows REDUCE when side is opposite of position.side, regardless of slider value", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));

      // Slider snapped to 4000 (position.size - 1000), sizeDiff = -1000
      expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();

      // Drag slider ABOVE position.size — old behavior would flip to INCREASE
      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "7000" } });

      // Still REDUCE because side is still short (opposite of position)
      expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();
      expect(screen.queryByText("INCREASE POSITION")).not.toBeInTheDocument();
    });

    it("toggles INCREASE/REDUCE when user clicks LONG then SHORT then LONG", () => {
      // Repro of the bug user reported: button label must respond to the
      // side toggle, not stay stuck because slider was dragged.
      openLong5k();
      render(<TradeControls />);

      const slider = screen.getByRole("slider") as HTMLInputElement;

      // Start: long position, side=long → INCREASE
      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();

      // Drag slider down (would have flipped old logic to REDUCE)
      fireEvent.change(slider, { target: { value: "4500" } });
      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();

      // Click SHORT → REDUCE
      fireEvent.click(screen.getByText("SHORT"));
      expect(screen.getByText("REDUCE POSITION")).toBeInTheDocument();

      // Click LONG → back to INCREASE
      fireEvent.click(screen.getByText("LONG"));
      expect(screen.getByText("INCREASE POSITION")).toBeInTheDocument();
    });

    it("snaps slider to position.size + 1000 on same-side click", () => {
      openLong5k();
      render(<TradeControls />);

      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "3000" } });
      expect(slider.value).toBe("3000");

      fireEvent.click(screen.getByText("LONG"));
      expect(slider.value).toBe("6000");
    });

    it("snaps slider to position.size - 1000 on opposite-side click", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("SHORT"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      expect(slider.value).toBe("4000");
    });

    it("does not snap slider in limit mode", () => {
      openLong5k();
      render(<TradeControls />);

      fireEvent.click(screen.getByText("Limit"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "4000" } });

      const longBtn = screen.getAllByRole("button").find((b) => b.textContent?.startsWith("LONG"));
      fireEvent.click(longBtn!);

      expect(slider.value).toBe("4000");
    });
  });
});
