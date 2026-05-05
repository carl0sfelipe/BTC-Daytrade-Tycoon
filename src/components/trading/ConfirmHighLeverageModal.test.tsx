import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmHighLeverageModal from "./ConfirmHighLeverageModal";

describe("ConfirmHighLeverageModal", () => {
  it("displays correct liquidation percentage for leverage 50 and 100", () => {
    const { rerender } = render(
      <ConfirmHighLeverageModal leverage={50} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("2.00%")).toBeInTheDocument();

    rerender(
      <ConfirmHighLeverageModal leverage={100} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("1.00%")).toBeInTheDocument();
  });

  it("clicking Cancel calls onCancel", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmHighLeverageModal leverage={50} onConfirm={vi.fn()} onCancel={onCancel} />
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clicking confirm calls onConfirm and onSkipChange(false) by default", () => {
    const onConfirm = vi.fn();
    const onSkipChange = vi.fn();
    render(
      <ConfirmHighLeverageModal
        leverage={50}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        onSkipChange={onSkipChange}
      />
    );

    fireEvent.click(screen.getByText("I understand the risks"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onSkipChange).toHaveBeenCalledWith(false);
  });

  it("checking 'Don't show again' then confirm calls onSkipChange(true)", () => {
    const onConfirm = vi.fn();
    const onSkipChange = vi.fn();
    render(
      <ConfirmHighLeverageModal
        leverage={50}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        onSkipChange={onSkipChange}
      />
    );

    fireEvent.click(screen.getByLabelText(/Don't show this warning again/i));
    fireEvent.click(screen.getByText("I understand the risks"));
    expect(onSkipChange).toHaveBeenCalledWith(true);
  });
});
