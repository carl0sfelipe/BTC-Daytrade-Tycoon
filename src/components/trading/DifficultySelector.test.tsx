import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DifficultySelector from "./DifficultySelector";
import { useTradingStore } from "@/store/tradingStore";
import { DIFFICULTY_PRESETS } from "@/lib/difficulty";

describe("DifficultySelector", () => {
  beforeEach(() => {
    useTradingStore.setState({ difficulty: "normal", maxLeverage: 50, startingWallet: 10_000 });
  });

  it("renders all four difficulty options", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(screen.getByText("Extreme")).toBeInTheDocument();
  });

  it("shows wallet and max leverage for each preset", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);

    expect(screen.getByText("$50,000")).toBeInTheDocument();
    expect(screen.getByText("max 10x")).toBeInTheDocument();

    expect(screen.getByText("$10,000")).toBeInTheDocument();
    expect(screen.getByText("max 50x")).toBeInTheDocument();

    expect(screen.getByText("$5,000")).toBeInTheDocument();
    expect(screen.getByText("max 100x")).toBeInTheDocument();

    expect(screen.getByText("$1,000")).toBeInTheDocument();
    expect(screen.getByText("max 125x")).toBeInTheDocument();
  });

  it("shows 'Selected' badge on the currently active difficulty", () => {
    useTradingStore.setState({ difficulty: "hard", maxLeverage: 100 });
    render(<DifficultySelector onConfirm={vi.fn()} />);

    const selected = screen.getAllByText("Selected");
    expect(selected).toHaveLength(1);
    // The badge appears alongside the Hard option
    expect(selected[0]).toBeInTheDocument();
  });

  it("clicking a difficulty updates the store", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByText("Easy").closest("button")!);

    const state = useTradingStore.getState();
    expect(state.difficulty).toBe("easy");
    expect(state.maxLeverage).toBe(DIFFICULTY_PRESETS.easy.maxLeverage);
    expect(state.startingWallet).toBe(DIFFICULTY_PRESETS.easy.wallet);
  });

  it("clicking Extreme sets maxLeverage to 125 and wallet to 1000", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByText("Extreme").closest("button")!);

    const state = useTradingStore.getState();
    expect(state.difficulty).toBe("extreme");
    expect(state.maxLeverage).toBe(125);
    expect(state.startingWallet).toBe(1_000);
  });

  it("Start Session button calls onConfirm", () => {
    const onConfirm = vi.fn();
    render(<DifficultySelector onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText("Start Session"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("has dialog role and aria-modal for accessibility", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "difficulty-title");
  });

  it("renders title and subtitle", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);
    expect(screen.getByText("Select Difficulty")).toBeInTheDocument();
    expect(screen.getByText(/affects starting wallet and max leverage/i)).toBeInTheDocument();
  });

  it("shows emoji icons for each difficulty", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);
    expect(screen.getByLabelText("Easy")).toBeInTheDocument();
    expect(screen.getByLabelText("Normal")).toBeInTheDocument();
    expect(screen.getByLabelText("Hard")).toBeInTheDocument();
    expect(screen.getByLabelText("Extreme")).toBeInTheDocument();
  });

  it("description text is shown for each preset", () => {
    render(<DifficultySelector onConfirm={vi.fn()} />);
    expect(screen.getByText(DIFFICULTY_PRESETS.easy.description)).toBeInTheDocument();
    expect(screen.getByText(DIFFICULTY_PRESETS.normal.description)).toBeInTheDocument();
    expect(screen.getByText(DIFFICULTY_PRESETS.hard.description)).toBeInTheDocument();
    expect(screen.getByText(DIFFICULTY_PRESETS.extreme.description)).toBeInTheDocument();
  });
});
