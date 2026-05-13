import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithStore } from "@/test/renderWithStore";
import { useTradingStore } from "@/store/tradingStore";
import TradeControls from "./TradeControls";
import PositionPanel from "./PositionPanel";
import OrdersPanel from "./OrdersPanel";

describe("Component Integration Tests with Real Store", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  describe("TradeControls", () => {
    it("flip button enabled when slider within effective wallet bounds", () => {
      renderWithStore(<TradeControls />, {
        store: {
          wallet: 500,
          currentPrice: 48000,
          reduceOnly: false,
          skipHighLeverageWarning: true,
        },
        position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000 },
      });

      // Switch to opposite side to trigger flip mode
      fireEvent.click(screen.getByText("SHORT"));

      // effectiveWallet = 500 + 100 - 40 = 560
      // sliderMax = 560 * 10 = 5600
      const slider = screen.getByRole("slider") as HTMLInputElement;
      expect(parseInt(slider.max, 10)).toBeLessThanOrEqual(5600);

      // At any value <= sliderMax, flip should be possible
      const actionBtn = screen.getByTestId("trade-controls-action-btn");
      expect(actionBtn).not.toBeDisabled();
    });

    it("slider max is greater than raw wallet when position has unrealized profit", () => {
      renderWithStore(<TradeControls />, {
        store: {
          wallet: 10000,
          currentPrice: 52000,
          reduceOnly: false,
        },
        position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000 },
      });

      // Switch to opposite side
      fireEvent.click(screen.getByText("SHORT"));

      const slider = screen.getByRole("slider") as HTMLInputElement;
      const max = parseInt(slider.max, 10);
      // With unrealized profit, effective wallet > raw wallet
      // So slider max should be > 10000 * leverage
      expect(max).toBeGreaterThan(100000);
    });
  });

  describe("PositionPanel", () => {
    it("closes position when close button is clicked", () => {
      renderWithStore(<PositionPanel />, {
        store: { currentPrice: 51000 },
        position: { side: "long", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 45000 },
      });

      fireEvent.click(screen.getByTestId("position-panel-close-btn"));
      expect(useTradingStore.getState().position).toBeNull();
      expect(useTradingStore.getState().closedTrades).toHaveLength(1);
    });

    it("displays position side badge", () => {
      renderWithStore(<PositionPanel />, {
        store: { currentPrice: 51000 },
        position: { side: "short", entry: 50000, size: 1000, leverage: 10, liquidationPrice: 55000 },
      });

      expect(screen.getByText("SHORT")).toBeInTheDocument();
    });
  });

  describe("OrdersPanel", () => {
    it("filters orders by status tab", () => {
      renderWithStore(<OrdersPanel />, {
        store: {
          ordersHistory: [
            { id: "1", side: "long", type: "market", status: "filled", leverage: 10, size: 500, price: 48000, executionPrice: 48000, tpPrice: null, slPrice: null, createdAt: "now", updatedAt: "now" },
            { id: "2", side: "long", type: "limit", status: "pending", leverage: 10, size: 300, price: 49000, executionPrice: null, tpPrice: null, slPrice: null, createdAt: "now", updatedAt: null },
            { id: "3", side: "long", type: "tp", status: "canceled", leverage: 10, size: 1000, price: 55000, executionPrice: null, tpPrice: null, slPrice: null, createdAt: "now", updatedAt: "now" },
          ],
          pendingOrders: [
            { id: "2", side: "long", orderType: "open", leverage: 10, size: 300, limitPrice: 49000, orderPrice: null, tpPrice: null, slPrice: null, createdAt: "now" },
          ],
        },
      });

      // Default tab "All" shows all 3 history items
      expect(screen.getAllByText(/pending|filled|canceled/).length).toBeGreaterThanOrEqual(3);

      // Click "Filled" tab - should show only filled orders
      fireEvent.click(screen.getByTestId("orders-panel-filter-filled"));
      expect(screen.getByText("filled")).toBeInTheDocument();
      expect(screen.queryByText("pending")).not.toBeInTheDocument();
      expect(screen.queryByText("canceled")).not.toBeInTheDocument();
    });

    it("cancels pending order when cancel button clicked", () => {
      renderWithStore(<OrdersPanel />, {
        store: {
          ordersHistory: [
            { id: "2", side: "long", type: "limit", status: "pending", leverage: 10, size: 300, price: 49000, executionPrice: null, tpPrice: null, slPrice: null, createdAt: "now", updatedAt: null },
          ],
          pendingOrders: [
            { id: "2", side: "long", orderType: "open", leverage: 10, size: 300, limitPrice: 49000, orderPrice: null, tpPrice: null, slPrice: null, createdAt: "now" },
          ],
        },
      });

      act(() => {
        fireEvent.click(screen.getByTestId("orders-panel-cancel-2"));
      });
      expect(useTradingStore.getState().pendingOrders).toHaveLength(0);
    });
  });
});
