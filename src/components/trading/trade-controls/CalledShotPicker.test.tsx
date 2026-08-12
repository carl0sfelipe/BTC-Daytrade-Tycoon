import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CalledShotPicker from "./CalledShotPicker";

function renderPicker(side: "long" | "short", tpPrice = "", onTpChange = vi.fn()) {
  render(
    <CalledShotPicker
      side={side}
      leverage={10}
      currentPrice={100_000}
      tpPrice={tpPrice}
      onTpChange={onTpChange}
    />
  );
  return onTpChange;
}

describe("CalledShotPicker", () => {
  it("labels pills with + for longs", () => {
    renderPicker("long");
    expect(screen.getByText("+3%")).toBeInTheDocument();
    expect(screen.getByText("+5%")).toBeInTheDocument();
    expect(screen.getByText("+10%")).toBeInTheDocument();
  });

  // Regression: "+5%" on a SHORT read as "waits for the price to rise" —
  // the pill must show the direction of the predicted move (a drop).
  it("labels pills with − for shorts", () => {
    renderPicker("short");
    expect(screen.getByText("−3%")).toBeInTheDocument();
    expect(screen.getByText("−5%")).toBeInTheDocument();
    expect(screen.getByText("−10%")).toBeInTheDocument();
  });

  it("arms a short call with the TP below the current price", () => {
    const onTpChange = renderPicker("short");
    fireEvent.click(screen.getByText("−5%"));
    expect(onTpChange).toHaveBeenCalledWith("95000.00");
  });

  it("arms a long call with the TP above the current price", () => {
    const onTpChange = renderPicker("long");
    fireEvent.click(screen.getByText("+5%"));
    expect(onTpChange).toHaveBeenCalledWith("105000.00");
  });

  it("previews the reward with the direction sign in the banner", () => {
    renderPicker("short", "95000");
    expect(screen.getByText(/−5\.0% @ 10x/)).toBeInTheDocument();
    expect(screen.getByText(/💎 if it hits/)).toBeInTheDocument();
  });
});
