import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SimulationClock from "./SimulationClock";

describe("SimulationClock", () => {
  const baseProps = {
    elapsedTime: "00:05:03",
    speed: 60,
    isPlaying: true,
    onPause: vi.fn(),
    onResume: vi.fn(),
    onReset: vi.fn(),
    onEnd: vi.fn(),
  };

  it("renders Simulation Time", () => {
    render(<SimulationClock {...baseProps} />);
    expect(screen.getByText("Simulation Time")).toBeInTheDocument();
    expect(screen.getByText("00:05:03")).toBeInTheDocument();
  });

  it("does NOT render Historical Start", () => {
    render(<SimulationClock {...baseProps} />);
    expect(screen.queryByText("Historical Start")).not.toBeInTheDocument();
  });

  it("renders control buttons", () => {
    render(<SimulationClock {...baseProps} />);
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders Resume when not playing", () => {
    render(<SimulationClock {...baseProps} isPlaying={false} />);
    expect(screen.getByText("Resume")).toBeInTheDocument();
  });
});
