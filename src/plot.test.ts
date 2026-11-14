import { describe, it, expect } from "vitest";
import {
  sampleGraph,
  STANDARD,
  zoomWindow,
  validWindow,
  gestureWindow,
} from "./plot";
describe("graph sampling", () => {
  it("pans without changing the span", () => {
    const w = gestureWindow(STANDARD, [0.5, 0.5], [0.75, 0.25], 1);
    expect(w.xmin).toBe(-15);
    expect(w.ymax).toBe(5);
    expect(w.xmax - w.xmin).toBe(20);
  });
  it("zooms around the pointer anchor", () => {
    const w = gestureWindow(STANDARD, [0.75, 0.25], [0.75, 0.25], 0.5);
    expect(w.xmin + 0.75 * (w.xmax - w.xmin)).toBe(5);
    expect(w.ymax - 0.25 * (w.ymax - w.ymin)).toBe(5);
    expect(w.xmax - w.xmin).toBe(10);
    expect(validWindow(w)).toBe(true);
  });
  it("samples a parabola correctly", () => {
    const points = sampleGraph("x^2", STANDARD, "RAD").flat();
    expect(points.some(([x, y]) => x === 0 && y === 0)).toBe(true);
    for (const [x, y] of points) expect(y).toBeCloseTo(x * x, 10);
  });
  it.each(["1/x", "1/(x-.013)", "tan(x)"])(
    "never connects across a pole: %s",
    (expression) => {
      const segments = sampleGraph(expression, STANDARD, "RAD");
      expect(segments.length).toBeGreaterThan(1);
      if (expression.startsWith("1/"))
        for (const segment of segments) {
          const pole = expression === "1/x" ? 0 : 0.013;
          expect(segment[0][0] < pole && segment.at(-1)![0] > pole).toBe(false);
        }
    },
  );
  it("handles undefined domains and invalid functions", () => {
    expect(
      sampleGraph("sqrt(x)", STANDARD, "RAD")
        .flat()
        .every(([x]) => x >= 0),
    ).toBe(true);
    expect(sampleGraph("bad(", STANDARD, "RAD")).toEqual([]);
  });
  it("zooms around the center and validates scales", () => {
    expect(zoomWindow(STANDARD, 0.5).xmin).toBe(-5);
    expect(validWindow({ ...STANDARD, xscl: 0 })).toBe(false);
  });
});
