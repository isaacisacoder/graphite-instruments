import { afterEach, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "./Home";
afterEach(cleanup);
it("offers nine real instrument destinations without marketing copy", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Graphite",
  );
  expect(screen.getAllByRole("link")).toHaveLength(9);
  expect(
    screen
      .getByRole("link", { name: "Open Graphing calculator" })
      .getAttribute("href"),
  ).toBe("#/graphing");
});
