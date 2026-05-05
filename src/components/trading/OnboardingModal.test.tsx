import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OnboardingModal from "./OnboardingModal";

describe("OnboardingModal", () => {
  it("Previous button is disabled on step 0", () => {
    render(<OnboardingModal onStart={vi.fn()} />);

    const prevBtn = screen.getByText("Previous").closest("button");
    expect(prevBtn).toBeDisabled();
  });

  it("clicking Next twice changes button to Start Simulation", () => {
    render(<OnboardingModal onStart={vi.fn()} />);

    expect(screen.getByText("Next")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Next")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Start Simulation")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("clicking Skip at step 0 calls onStart once", () => {
    const onStart = vi.fn();
    render(<OnboardingModal onStart={onStart} />);

    fireEvent.click(screen.getByText("Skip"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("clicking Start Simulation at final step calls onStart once", () => {
    const onStart = vi.fn();
    render(<OnboardingModal onStart={onStart} />);

    // Navigate to final step
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));

    fireEvent.click(screen.getByText("Start Simulation"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
