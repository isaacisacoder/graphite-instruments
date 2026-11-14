import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PlotWorkspace from "./PlotWorkspace";
import { restorePlot, readPoint, ticks } from "./plotModel";
import { STANDARD } from "../plot";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
describe("large graph model", () => {
  it("evaluates coordinate expressions and rejects invalid domains", () => {
    expect(readPoint({ x: "pi/2", y: "2+3*4" })).toEqual([Math.PI / 2, 14]);
    expect(readPoint({ x: "1/0", y: "4" })).toBeNull();
    expect(readPoint({ x: "", y: "4" })).toBeNull();
    expect(readPoint({ x: "sqrt(-1)", y: "4" })).toBeNull();
  });
  it("recovers invalid saved windows and bounds stored input", () => {
    const d = restorePlot(
      JSON.stringify({
        curves: [{ expression: "x".repeat(500), enabled: true }],
        points: [{ x: "1", y: "2" }],
        window: { ...STANDARD, xmin: 10 },
      }),
    );
    expect(d.window).toEqual(STANDARD);
    expect(d.curves[0].expression.length).toBe(240);
    expect(d.points).toEqual([{ id: "p1", x: "1", y: "2" }]);
    expect(restorePlot("broken").window).toEqual(STANDARD);
  });
  it("produces bounded legible ticks through zoom scales", () => {
    for (const [min, max] of [
      [-10, 10],
      [-0.000003, 0.000004],
      [150000, 250000],
      [-12, -2],
    ]) {
      const values = ticks(min, max);
      expect(values.length).toBeGreaterThan(3);
      expect(values.length).toBeLessThan(30);
      expect(
        values.every(
          (n, i) =>
            Number.isFinite(n) &&
            n >= min &&
            n <= max &&
            (i === 0 || n > values[i - 1]),
        ),
      ).toBe(true);
    }
  });
});
function mount() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  render(<PlotWorkspace />);
}
it("edits independent curves, toggles them, and persists point tables", () => {
  mount();
  fireEvent.change(screen.getByLabelText("Y1 expression"), {
    target: { value: "x^3" },
  });
  fireEvent.change(screen.getByLabelText("Y2 expression"), {
    target: { value: "1/x" },
  });
  fireEvent.click(screen.getByLabelText("Show Y2"));
  fireEvent.change(screen.getByLabelText("Point 1 x"), {
    target: { value: "pi" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add point" }));
  fireEvent(window, new Event("pagehide"));
  const saved = restorePlot(localStorage.getItem("graphite:plot"));
  expect(saved.curves).toEqual([
    { id: "y1", expression: "x^3", enabled: true },
    { id: "y2", expression: "1/x", enabled: false },
  ]);
  expect(saved.points[0].x).toBe("pi");
  expect(saved.points).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Remove point 4" }));
  fireEvent(window, new Event("pagehide"));
  expect(
    restorePlot(localStorage.getItem("graphite:plot")).points,
  ).toHaveLength(3);
});
it("allows incomplete window edits, validates on apply, and fits across a pole", () => {
  mount();
  fireEvent.click(
    document.querySelector("summary.plot-window-summary") ??
      document.querySelector(".plot-window summary")!,
  );
  fireEvent.change(screen.getByLabelText("xmin"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply window" }));
  expect(screen.getByRole("alert").textContent).toContain("Minimums");
  fireEvent.change(screen.getByLabelText("xmin"), { target: { value: "-5" } });
  fireEvent.change(screen.getByLabelText("xmax"), {
    target: { value: "4.99999985" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply window" }));
  fireEvent.change(screen.getByLabelText("Y2 expression"), {
    target: { value: "1/x" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Fit" }));
  fireEvent(window, new Event("pagehide"));
  const w = restorePlot(localStorage.getItem("graphite:plot")).window;
  expect(w.ymax - w.ymin).toBeLessThan(1000);
  expect(screen.queryByRole("alert")).toBeNull();
});
