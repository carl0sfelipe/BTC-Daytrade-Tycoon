import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useTradingStore } from "@/store/tradingStore";
import TrailingStopControl from "./TrailingStopControl";

interface RenderOverrides {
  trailingStopPercent?: number | null;
  trailingStopPrice?: number | null;
  inputValue?: string;
}

function renderTrailingControl(overrides: RenderOverrides = {}) {
  const onInputChange = vi.fn();
  const onSetTrailingStop = vi.fn();
  render(
    <TrailingStopControl
      trailingStopPercent={overrides.trailingStopPercent ?? null}
      trailingStopPrice={overrides.trailingStopPrice ?? null}
      inputValue={overrides.inputValue ?? ""}
      onInputChange={onInputChange}
      onSetTrailingStop={onSetTrailingStop}
    />
  );
  return { onInputChange, onSetTrailingStop };
}

describe("TrailingStopControl", () => {
  it("renders the label, percent input and a disabled Set button when empty", () => {
    renderTrailingControl();

    expect(screen.getByText("Trailing Stop")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.0")).toBeInTheDocument();
    expect(screen.getByTestId("trailing-stop-set")).toBeDisabled();
    expect(screen.queryByTestId("trailing-stop-remove")).not.toBeInTheDocument();
  });

  it("forwards typed values to onInputChange", () => {
    const { onInputChange } = renderTrailingControl();

    fireEvent.change(screen.getByTestId("trailing-stop-input"), {
      target: { value: "7.5" },
    });

    expect(onInputChange).toHaveBeenCalledWith("7.5");
  });

  it("arms the trailing stop with the parsed percent on Set", () => {
    const { onSetTrailingStop } = renderTrailingControl({ inputValue: "5" });

    const setButton = screen.getByTestId("trailing-stop-set");
    expect(setButton).toBeEnabled();
    fireEvent.click(setButton);

    expect(onSetTrailingStop).toHaveBeenCalledWith(5);
  });

  // Bug B2 regression (a5a87eb): values over 20% must not be armable.
  it("disables Set for values over 20 and at or below 0", () => {
    renderTrailingControl({ inputValue: "25" });
    expect(screen.getByTestId("trailing-stop-set")).toBeDisabled();
  });

  it("disables Set for zero", () => {
    renderTrailingControl({ inputValue: "0" });
    expect(screen.getByTestId("trailing-stop-set")).toBeDisabled();
  });

  it("shows the active stop price and swaps Set for Remove when armed", () => {
    renderTrailingControl({ trailingStopPercent: 5, trailingStopPrice: 47500 });

    expect(screen.getByText("@47,500.00")).toBeInTheDocument();
    expect(screen.getByTestId("trailing-stop-remove")).toBeInTheDocument();
    expect(screen.queryByTestId("trailing-stop-set")).not.toBeInTheDocument();
  });

  it("Remove clears the stop and the input", () => {
    const { onInputChange, onSetTrailingStop } = renderTrailingControl({
      trailingStopPercent: 5,
      trailingStopPrice: 47500,
      inputValue: "5",
    });

    fireEvent.click(screen.getByTestId("trailing-stop-remove"));

    expect(onSetTrailingStop).toHaveBeenCalledWith(null);
    expect(onInputChange).toHaveBeenCalledWith("");
  });
});

describe("TrailingStopControl pt-BR", () => {
  afterEach(() => {
    useTradingStore.setState({ gameLocale: "en" });
  });

  it("renders the Set button as Definir", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    renderTrailingControl();

    expect(screen.getByTestId("trailing-stop-set")).toHaveTextContent("Definir");
  });

  it("renders the Remove button as Remover when armed", () => {
    useTradingStore.setState({ gameLocale: "pt-BR" });
    renderTrailingControl({ trailingStopPercent: 3, trailingStopPrice: 48500 });

    expect(screen.getByTestId("trailing-stop-remove")).toHaveTextContent("Remover");
  });
});
