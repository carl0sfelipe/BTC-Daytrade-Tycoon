import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import LocaleToggle from "./LocaleToggle";

describe("LocaleToggle", () => {
  beforeEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("shows the target locale (PT) while in English", () => {
    render(<LocaleToggle />);
    expect(screen.getByTestId("locale-toggle")).toHaveTextContent("PT");
  });

  it("switches the store locale on click and re-renders the label", () => {
    render(<LocaleToggle />);

    fireEvent.click(screen.getByTestId("locale-toggle"));
    expect(useTradingStore.getState().gameLocale).toBe("pt-BR");
    expect(screen.getByTestId("locale-toggle")).toHaveTextContent("EN");

    fireEvent.click(screen.getByTestId("locale-toggle"));
    expect(useTradingStore.getState().gameLocale).toBe("en");
    expect(screen.getByTestId("locale-toggle")).toHaveTextContent("PT");
  });
});
