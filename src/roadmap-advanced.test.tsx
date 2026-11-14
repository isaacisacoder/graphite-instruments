import { it, expect, afterEach, vi } from "vitest";
import {
  renderHook,
  act,
  cleanup,
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { integrate } from "./suite/integrate";
import { analyze, type AnalysisRequest } from "./suite/analysis";
import { importWorkspace, parsePoints } from "./suite/graphIO";
import {
  INITIAL_PLOT,
  restorePlot,
  readPoint,
  equalWindow,
} from "./suite/plotModel";
import { normalTail } from "./suite/normalTail";
import { matrix } from "./suite/numeric";
import { factorize } from "./suite/lu";
import { useUndo } from "./useUndo";
import Lite from "./suite/LiteCalculator";
import PlotWorkspace from "./suite/PlotWorkspace";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  window.location.hash = "";
});
it("integrates reversed, smooth and narrow peaks and rejects singular intervals", () => {
  expect(integrate((x) => x * x, 1, 0).value).toBeCloseTo(-1 / 3, 10);
  expect(
    integrate((x) => Math.exp(-10000 * (x - 0.37) ** 2), 0, 1).value,
  ).toBeCloseTo(Math.sqrt(Math.PI) / 100, 9);
  expect(() => integrate((x) => 1 / x, -1, 1)).toThrow();
  expect(
    integrate(
      () => {
        throw Error();
      },
      2,
      2,
    ).value,
  ).toBe(0);
});
it("solves row-scaled systems directly and marks ill-conditioning", () => {
  const f = factorize([
    [1e16, 0],
    [0, 1],
  ]);
  expect(f.solve([2e16, 3])).toEqual([2, 3]);
  expect(f.warning).toBeTruthy();
  expect(
    factorize([
      [1, 2],
      [2, 4],
    ]).singular,
  ).toBe(true);
});
it("retains accurate extreme normal tails", () => {
  expect(normalTail(10) / 7.61985302416047e-24).toBeCloseTo(1, 11);
  expect(normalTail(1.96)).toBeCloseTo(0.024997895148, 11);
});
it("migrates old graph data with stable ids while keeping its viewport policy", () => {
  const old = {
    curves: [{ expression: "x", enabled: true }],
    points: [{ x: "1", y: "2" }],
    window: INITIAL_PLOT.window,
  };
  const a = restorePlot(JSON.stringify(old)),
    b = restorePlot(JSON.stringify(old));
  expect(a.curves[0].id).toBe(b.curves[0].id);
  expect(a.equalUnits).toBe(false);
  expect(importWorkspace(JSON.stringify(a))).toEqual(a);
  expect(() =>
    importWorkspace(JSON.stringify({ ...a, version: 99 })),
  ).toThrow();
  expect(() =>
    importWorkspace(
      JSON.stringify({
        ...a,
        points: [{ id: a.curves[0].id, x: "1", y: "2" }],
      }),
    ),
  ).toThrow();
});
it("parses quoted coordinate expressions and validates atomic bulk imports", () => {
  expect(parsePoints('x,y\n"log(8,2)",4')[0].x).toBe("log(8,2)");
  expect(parsePoints("1\t2\n3\t4")).toHaveLength(2);
  expect(() => parsePoints("1,2\n3,1/0")).toThrow(/Row 2/);
  expect(readPoint({ x: "sin(30)", y: "a" }, "DEG", { a: 2 })).toEqual([
    0.49999999999999994, 2,
  ]);
});
it("equal-unit viewports follow pixel aspect ratios", () => {
  const w = equalWindow(INITIAL_PLOT.window, 2);
  expect((w.xmax - w.xmin) / (w.ymax - w.ymin)).toBe(2);
});
it("groups bursts and bounds undo while keeping redo coherent", () => {
  const { result } = renderHook(() => useUndo(() => 0));
  act(() => {
    result.current.set(1, "text");
    result.current.set(2, "text");
  });
  act(() => result.current.undo());
  expect(result.current.state).toBe(0);
  act(() => result.current.redo());
  expect(result.current.state).toBe(2);
  act(() => {
    for (let i = 3; i < 110; i++) result.current.set(i);
  });
  act(() => {
    for (let i = 0; i < 110; i++) result.current.undo();
  });
  expect(result.current.state).toBe(9);
});
const request: AnalysisRequest = {
  id: "test",
  operation: "roots",
  expression: "x^2-4",
  other: "",
  angle: "RAD",
  parameters: {},
  lower: -3,
  upper: 3,
};
it("finds roots, tangencies, intersections, extrema and bounded integrals", () => {
  expect(analyze(request).points.map((p) => Math.round(p[0]))).toEqual([-2, 2]);
  expect(
    analyze({ ...request, expression: "(x-.123)^2" }).points[0][0],
  ).toBeCloseTo(0.123, 6);
  expect(
    analyze({
      ...request,
      operation: "intersection",
      expression: "x",
      other: "2-x",
    }).points[0][0],
  ).toBeCloseTo(1, 7);
  expect(
    analyze({ ...request, operation: "maximum", expression: "3-(x-2)^2" })
      .points[0][1],
  ).toBeCloseTo(3, 7);
  expect(
    analyze({
      ...request,
      operation: "integral",
      expression: "x^2",
      lower: 0,
      upper: 1,
    }).value,
  ).toBeCloseTo(1 / 3, 10);
  expect(analyze({ ...request, expression: "1/x" }).points).toHaveLength(0);
});
it("does not evaluate again on held Enter, and AC retains history", () => {
  window.location.hash = "#/basic";
  render(<Lite />);
  const input = screen.getByLabelText("Expression");
  fireEvent.change(input, { target: { value: "2+3" } });
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.keyDown(input, { key: "Enter", repeat: true });
  fireEvent.keyDown(input, { key: "Enter", repeat: true });
  expect(document.querySelectorAll(".lite-history button")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "All clear" }));
  expect(document.querySelector(".lite-display output")?.textContent).toBe("0");
  expect(document.querySelectorAll(".lite-history button")).toHaveLength(1);
});
it("updates selected traces after edits and exposes errors independently", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  render(<PlotWorkspace />);
  fireEvent.change(screen.getByLabelText("Inspect graph item"), {
    target: { value: "c:y1" },
  });
  expect(document.querySelector(".trace-controls output")?.textContent).toBe(
    "(0, 0)",
  );
  fireEvent.change(screen.getByLabelText("Y1 expression"), {
    target: { value: "x^2+5" },
  });
  expect(document.querySelector(".trace-controls output")?.textContent).toBe(
    "(0, 5)",
  );
  fireEvent.change(screen.getByLabelText("Y1 expression"), {
    target: { value: "sqrt(-1)" },
  });
  expect(
    document.querySelector(".trace-controls output")?.textContent,
  ).toContain("Undefined");
});

it("does not report tiny nonzero constants as roots", () => {
  expect(analyze({ ...request, expression: "1e-100" }).points).toEqual([]);
  expect(analyze({ ...request, expression: "0" }).message).toContain(
    "isolated",
  );
});
it("solves systems even when an unrelated determinant overflows", () => {
  const f = factorize([
    [1e100, 0, 0, 0],
    [0, 1e100, 0, 0],
    [0, 0, 1e100, 0],
    [0, 0, 0, 1e100],
  ]);
  expect(f.solve([1e100, 2e100, 3e100, 4e100])).toEqual([1, 2, 3, 4]);
});

it("keeps raw and structured matrix separators consistent", () => {
  expect(matrix("1 2;3 4")).toEqual([
    [1, 2],
    [3, 4],
  ]);
  expect(matrix('"log(8,2)",1\n0,2')).toEqual([
    [3, 1],
    [0, 2],
  ]);
});
