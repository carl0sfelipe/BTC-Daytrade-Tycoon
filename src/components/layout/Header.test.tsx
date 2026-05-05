import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Header from "./Header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/trading",
}));

vi.mock("@/store/tradingStore", () => ({
  useTradingStore: (selector: (s: { wallet: number; closedTrades: [] }) => unknown) =>
    selector({ wallet: 13168.03, closedTrades: [] }),
}));

vi.mock("@/utils/streak", () => ({
  getCurrentStreak: () => 3,
}));

describe("Header responsive layout", () => {
  it("has flex-wrap for responsive row breaking", () => {
    const { container } = render(<Header />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("flex-wrap");
  });

  it("hides nav labels on small screens", () => {
    const { container } = render(<Header />);
    const labels = container.querySelectorAll("nav span.hidden.md\\:inline");
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });

  it("truncates balance on small screens", () => {
    const { container } = render(<Header />);
    const balance = container.querySelector("span.truncate");
    expect(balance).toBeInTheDocument();
    expect(balance).toHaveClass("max-w-[100px]");
  });
});
