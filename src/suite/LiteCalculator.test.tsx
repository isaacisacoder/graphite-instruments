import { beforeEach, afterEach, it, expect } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import LiteCalculator from "./LiteCalculator";
beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/basic";
});
afterEach(() => {
  cleanup();
  window.location.hash = "";
});
it("ignores graph-only shortcuts rather than entering a hidden mode", () => {
  render(<LiteCalculator />);
  fireEvent.keyDown(window, { key: "F1" });
  fireEvent.keyDown(window, { key: "2" });
  expect(
    (screen.getByRole("textbox", { name: "Expression" }) as HTMLInputElement)
      .value,
  ).toBe("2");
});
it("toggles the sign of a valid active value", () => {
  render(<LiteCalculator />);
  const input = screen.getByRole("textbox", { name: "Expression" });
  fireEvent.change(input, { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "±" }));
  expect((input as HTMLInputElement).value).toBe("-5");
  fireEvent.click(screen.getByRole("button", { name: "±" }));
  expect((input as HTMLInputElement).value).toBe("5");
});
