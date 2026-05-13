import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithStore } from "@/test/renderWithStore";
import EventLog from "./EventLog";
import { buildEventLog } from "@/lib/trading/event-log";
import { makeTrade, makeOrderHistoryItem } from "@/test/factories";

describe("EventLog", () => {
  it("shows empty state when no events", () => {
    renderWithStore(<EventLog events={[]} />);
    expect(screen.getByTestId("event-log-empty")).toBeInTheDocument();
    expect(screen.getByText("No events yet")).toBeInTheDocument();
  });

  it("renders trade closure events", () => {
    const events = buildEventLog(
      [makeTrade({ reason: "liquidation", exitPrice: 45000, pnl: -500, side: "long" })],
      []
    );
    renderWithStore(<EventLog events={events} />);

    expect(screen.getByText("Liquidated")).toBeInTheDocument();
    expect(screen.getByText("long")).toBeInTheDocument();
    expect(screen.getByText(/-500\.00/)).toBeInTheDocument();
  });

  it("renders order filled events", () => {
    const events = buildEventLog(
      [],
      [makeOrderHistoryItem({ type: "limit", status: "filled", executionPrice: 49000 })]
    );
    renderWithStore(<EventLog events={events} />);

    expect(screen.getByText("Limit Order Filled")).toBeInTheDocument();
  });

  it("renders canceled order events", () => {
    const events = buildEventLog(
      [],
      [makeOrderHistoryItem({ status: "canceled" })]
    );
    renderWithStore(<EventLog events={events} />);

    expect(screen.getByText("Order Canceled")).toBeInTheDocument();
  });

  it("renders multiple events with correct data-testid", () => {
    const events = buildEventLog(
      [
        makeTrade({ reason: "tp", exitPrice: 55000, pnl: 200 }),
        makeTrade({ reason: "manual", exitPrice: 51000, pnl: 50 }),
      ],
      []
    );
    renderWithStore(<EventLog events={events} />);

    expect(screen.getByTestId("event-log-row-trade-1")).toBeInTheDocument();
    expect(screen.getByTestId("event-log-row-trade-0")).toBeInTheDocument();
  });
});
