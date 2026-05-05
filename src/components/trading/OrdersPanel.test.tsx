import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrdersPanel from "./OrdersPanel";
import { useTradingStore } from "@/store/tradingStore";

describe("OrdersPanel", () => {
  it("renders empty state when no orders", () => {
    useTradingStore.setState({ ordersHistory: [], pendingOrders: [] });
    render(<OrdersPanel />);

    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("No orders")).toBeInTheDocument();
  });

  it("tab labels include correct counts", () => {
    useTradingStore.setState({
      ordersHistory: [
        { id: "1", side: "long", type: "market", status: "filled", leverage: 10, size: 1000, price: 50000, executionPrice: null, tpPrice: null, slPrice: null, createdAt: "t1", updatedAt: "t1" },
        { id: "2", side: "short", type: "limit", status: "canceled", leverage: 10, size: 500, price: 52000, executionPrice: null, tpPrice: null, slPrice: null, createdAt: "t2", updatedAt: "t2" },
      ],
      pendingOrders: [
        { id: "3", side: "long", orderType: "open" as const, leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null, createdAt: "t3" },
      ],
    });
    render(<OrdersPanel />);

    expect(screen.getByText("All (2)")).toBeInTheDocument();
    expect(screen.getByText("Pending (1)")).toBeInTheDocument();
    expect(screen.getByText("Filled (1)")).toBeInTheDocument();
    expect(screen.getByText("Canceled (1)")).toBeInTheDocument();
  });

  it("clicking Pending filter shows only pending rows", () => {
    useTradingStore.setState({
      ordersHistory: [
        { id: "1", side: "long", type: "market", status: "filled", leverage: 10, size: 1000, price: 50000, executionPrice: null, tpPrice: null, slPrice: null, createdAt: "t1", updatedAt: "t1" },
      ],
      pendingOrders: [
        { id: "2", side: "long", orderType: "open" as const, leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null, createdAt: "t2" },
      ],
    });
    render(<OrdersPanel />);

    // Initially "all" shows history items (pending orders shown in separate list logic)
    // Click Pending filter
    fireEvent.click(screen.getByText("Pending (1)"));

    // The "filled" row should be hidden (not in pendingOrders)
    expect(screen.queryByText("filled")).not.toBeInTheDocument();
  });

  it("cancel button calls cancelPendingOrder when clicked", () => {
    useTradingStore.setState({
      ordersHistory: [
        { id: "2", side: "long", type: "limit", status: "pending", leverage: 10, size: 1000, price: 48000, executionPrice: null, tpPrice: null, slPrice: null, createdAt: "t2", updatedAt: "t2" },
      ],
      pendingOrders: [
        { id: "2", side: "long", orderType: "open" as const, leverage: 10, size: 1000, tpPrice: null, slPrice: null, limitPrice: 48000, orderPrice: null, createdAt: "t2" },
      ],
    });

    const spy = vi.spyOn(useTradingStore.getState(), "cancelPendingOrder");
    render(<OrdersPanel />);

    // Find the cancel button by querying all buttons and finding one with an svg
    const allButtons = screen.getAllByRole("button");
    // The cancel button is the one with an SVG icon inside (XCircle)
    const cancelButtons = allButtons.filter((btn) => btn.querySelector("svg"));
    expect(cancelButtons.length).toBeGreaterThan(0);

    fireEvent.click(cancelButtons[0]);
    expect(spy).toHaveBeenCalledWith("2");

    spy.mockRestore();
  });

  it("renders order details with side, type, leverage, and TP/SL", () => {
    useTradingStore.setState({
      ordersHistory: [
        { id: "1", side: "long", type: "market", status: "filled", leverage: 10, size: 1000, price: 50000, executionPrice: null, tpPrice: 55000, slPrice: 45000, createdAt: "t1", updatedAt: "t1" },
      ],
      pendingOrders: [],
    });
    render(<OrdersPanel />);

    // Side, type, and status are rendered as text nodes
    expect(screen.getByText("long")).toBeInTheDocument();
    expect(screen.getByText("Market")).toBeInTheDocument();
    expect(screen.getByText("filled")).toBeInTheDocument();
    // TP and SL values appear in the detail row
    expect(document.body.textContent).toContain("TP $55000");
    expect(document.body.textContent).toContain("SL $45000");
  });
});
