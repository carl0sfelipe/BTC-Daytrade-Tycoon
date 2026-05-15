import { screen, fireEvent } from "@testing-library/react";

export function getSlider(): HTMLInputElement {
  return screen.getByRole("slider") as HTMLInputElement;
}

export function setSliderValue(value: string) {
  fireEvent.change(getSlider(), { target: { value } });
}

export function clickSide(side: "LONG" | "SHORT") {
  fireEvent.click(screen.getByText(side));
}
