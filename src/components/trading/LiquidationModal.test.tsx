import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LiquidationModal from "./LiquidationModal";

describe("LiquidationModal", () => {
  it("splits realDate into Start and End dates", () => {
    render(
      <LiquidationModal
        realDate="01/01/2020 → 01/06/2020"
        elapsedTime="00:10:15"
        simulatedHistoricalTime="10h"
        onNewSession={vi.fn()}
      />
    );

    expect(screen.getByText("01/01/2020")).toBeInTheDocument();
    expect(screen.getByText("01/06/2020")).toBeInTheDocument();
  });

  it("clicking New Session calls onNewSession", () => {
    const onNewSession = vi.fn();
    render(
      <LiquidationModal
        realDate="01/01/2020 → 01/06/2020"
        elapsedTime="00:10:15"
        simulatedHistoricalTime="10h"
        onNewSession={onNewSession}
      />
    );

    fireEvent.click(screen.getAllByText("New Session")[0]);
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it("REGRESSION-LOCK: both Back and New Session buttons call onNewSession", () => {
    // LOCKED: LiquidationModal.tsx:82-87 has both buttons wired to onNewSession.
    // Likely a bug — Back should distinguish 'return without reset' from 'start over'.
    // If/when fixed, change this assertion to expect onClose instead.
    const onNewSession = vi.fn();
    render(
      <LiquidationModal
        realDate="01/01/2020 → 01/06/2020"
        elapsedTime="00:10:15"
        simulatedHistoricalTime="10h"
        onNewSession={onNewSession}
      />
    );

    fireEvent.click(screen.getAllByText("Back")[0]);
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it("renders elapsedTime and simulatedHistoricalTime", () => {
    render(
      <LiquidationModal
        realDate="01/01/2020 → 01/06/2020"
        elapsedTime="00:10:15"
        simulatedHistoricalTime="10h"
        onNewSession={vi.fn()}
      />
    );

    expect(screen.getByText("00:10:15")).toBeInTheDocument();
    expect(screen.getByText("10h")).toBeInTheDocument();
  });
});
