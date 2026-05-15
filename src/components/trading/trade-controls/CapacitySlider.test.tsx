import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CapacitySlider from "./CapacitySlider";

describe("CapacitySlider (prototype)", () => {
  it("renders with safe, reduce, and max zones", () => {
    render(
      <CapacitySlider
        label="Size"
        positionSize={500}
        sliderMax={2000}
        currentSize={1000}
        safeMax={800}
        reduceMax={1500}
        onChange={() => {}}
      />
    );

    expect(screen.getByText("Size")).toBeInTheDocument();
    // toLocaleString() uses locale-specific separators
    expect(screen.getByText(/Current: \$1[.,]?000/)).toBeInTheDocument();
    expect(screen.getByTestId("trade-controls-capacity-slider")).toHaveValue("500");

    // Zone marker "Safe" + legend "Safe" = 2 occurrences
    expect(screen.getAllByText("Safe")).toHaveLength(2);
    // Zone marker "Flip" + legend "Flip zone" = 1 occurrence of exact "Flip"
    expect(screen.getByText("Flip")).toBeInTheDocument();

    // Legend labels
    expect(screen.getByText("Flip zone")).toBeInTheDocument();
    expect(screen.getByText("Absolute max")).toBeInTheDocument();
  });

  it("computes gradient stops from safe and reduce maxes", () => {
    const { container } = render(
      <CapacitySlider
        label="Size"
        positionSize={100}
        sliderMax={1000}
        currentSize={null}
        safeMax={300}
        reduceMax={700}
        onChange={() => {}}
      />
    );

    const slider = container.querySelector(".capacity-slider") as HTMLElement;
    const bg = slider.style.background;
    expect(bg).toContain("linear-gradient");
    expect(bg).toContain("#22c55e"); // green
    expect(bg).toContain("#eab308"); // yellow
    expect(bg).toContain("#ef4444"); // red
  });
});
