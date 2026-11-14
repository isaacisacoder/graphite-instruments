import { describe, it, expect } from "vitest";
import { evaluate, numberText } from "./math";
import { initialState, reducer, restoreState, type State } from "./state";
import { STANDARD, validWindow, sampleGraph, zoomWindow } from "./plot";
const key = (s: State, k: string) => reducer(s, { type: "key", key: k });
describe("numeric stress", () => {
  it("retains percentage, modulo and nested factorial behavior after operation checks", () => {
    expect(evaluate("2+20%", "RAD")).toBe(2.4);
    expect(evaluate("5%2", "RAD")).toBe(1);
    expect(evaluate("-5%2", "RAD")).toBe(1);
    expect(evaluate("(3!)!", "RAD")).toBe(720);
  });
  it.each([
    "sqrt(-1)^0",
    "ln(0)^0",
    "(1/0)^0",
    "1/(1e308*1e308)",
    "(sqrt(-1)^0)+1",
    "(1/(1e308*1e308))+2",
    "sqrt((1/0)^0)",
  ])("does not hide an invalid intermediate result: %s", (expr) =>
    expect(() => evaluate(expr, "RAD")).toThrow(),
  );
  it("checks 5000 deterministic arithmetic expressions against direct numeric arithmetic", () => {
    let seed = 9371;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < 5000; i++) {
      const a = Math.floor(random() * 200) - 100,
        b = Math.floor(random() * 200) - 100,
        c = Math.floor(random() * 99) + 1;
      const actual = evaluate(`(${a}+${b})*${c}-(${b})^2`, "RAD");
      expect(actual).toBe((a + b) * c - b * b);
      expect(numberText(actual)).not.toMatch(/NaN|Infinity/);
    }
  });
  it.each([
    "a=1",
    "x[0]",
    'import("x")',
    "true",
    "[1,2]",
    "2;3",
    "sin(2,3)",
    "log(2,1)",
    "factorial(171)",
  ])("rejects malformed or unsupported expression %s", (expr) =>
    expect(() => evaluate(expr, "RAD")).toThrow(),
  );
});
describe("window and history stress", () => {
  it("preserves bounded state through 20000 deterministic hardware events", () => {
    const keys = [
      "0",
      "1",
      "2",
      "3",
      "+",
      "−",
      "×",
      "÷",
      "^",
      "ENTER",
      "CLEAR",
      "DEL",
      "2ND",
      "ALPHA",
      "MODE",
      "ON",
      "Y=",
      "WINDOW",
      "ZOOM",
      "TRACE",
      "GRAPH",
      "MATH",
      "VARS",
      "STAT",
      "APPS",
      "PRGM",
      "SIN",
      "COS",
      "TAN",
      "LOG",
      "LN",
      "x²",
      "(",
      ")",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ];
    let seed = 12371,
      s = initialState;
    for (let i = 0; i < 20000; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      s = key(s, keys[seed % keys.length]);
      expect(validWindow(s.window)).toBe(true);
      expect(s.entry.length).toBeLessThanOrEqual(512);
      expect(s.functions.every((f) => f.expression.length <= 512)).toBe(true);
      expect(s.history.length).toBeLessThanOrEqual(50);
      expect(Number.isFinite(s.ans)).toBe(true);
    }
  });
  it("continues the last answer when choosing a postfix MATH item", () => {
    let s = key({ ...initialState, entry: "3", cursor: 1 }, "ENTER");
    s = key(s, "MATH");
    s = reducer(s, { type: "select", index: 2 });
    s = key(s, "ENTER");
    expect(s.entry).toBe("Ans!");
  });
  it("rejects overflowing spans", () =>
    expect(validWindow({ ...STANDARD, xmin: -1e308, xmax: 1e308 })).toBe(
      false,
    ));
  it("keeps zoom center finite for large finite bounds", () => {
    const w = zoomWindow({ ...STANDARD, xmin: 1e308, xmax: 1.1e308 }, 0.5);
    expect(Object.values(w).every(Number.isFinite)).toBe(true);
  });
  it("retains a valid graph window after 150 repeated zoom-ins", () => {
    let s = initialState;
    for (let i = 0; i < 150; i++) {
      s = key(s, "ZOOM");
      s = reducer(s, { type: "select", index: 1 });
      s = key(s, "ENTER");
    }
    expect(validWindow(s.window)).toBe(true);
  });
  it("fits large constants instead of treating them as undefined", () => {
    let s = {
      ...initialState,
      functions: initialState.functions.map((f, i) => ({
        ...f,
        enabled: i === 0,
        expression: i === 0 ? "1e12" : "",
      })),
    };
    s = key(s, "ZOOM");
    s = reducer(s, { type: "select", index: 3 });
    s = key(s, "ENTER");
    expect(s.error).toBe("");
    expect(s.window.ymin).toBeLessThan(1e12);
    expect(s.window.ymax).toBeGreaterThan(1e12);
  });
  it("reports sum overflow, but can average large finite numbers", () => {
    const source = {
      ...initialState,
      history: [
        { expression: "1e308", result: 1e308 },
        { expression: "1e308", result: 1e308 },
      ],
    };
    let s = key(source, "STAT");
    s = reducer(s, { type: "select", index: 1 });
    s = key(s, "ENTER");
    expect(s.error).not.toBe("");
    s = key(source, "STAT");
    s = key(s, "ENTER");
    expect(s.entry).toBe("1e+308");
  });
  it("retains only 50 records after 300 calculations", () => {
    let s = initialState;
    for (let i = 0; i < 300; i++) {
      s = reducer(s, {
        type: "edit",
        value: String(i),
        cursor: String(i).length,
      });
      s = key(s, "ENTER");
    }
    expect(s.history).toHaveLength(50);
    expect(s.ans).toBe(299);
  });
});
describe("restoration and graph stress", () => {
  it("inserts MATH items at the home cursor", () => {
    let s = { ...initialState, entry: "23", cursor: 1 };
    s = key(s, "MATH");
    s = key(s, "ENTER");
    expect(s.entry).toBe("2sqrt(3");
    expect(s.cursor).toBe(6);
  });
  it("returns MATH insertion to the active function slot", () => {
    let s = key(initialState, "Y=");
    s = reducer(s, { type: "select", index: 1 });
    s = reducer(s, { type: "edit", value: "x", cursor: 0 });
    s = key(s, "MATH");
    s = key(s, "ENTER");
    expect(s.screen).toBe("functions");
    expect(s.selected).toBe(1);
    expect(s.functions[1].expression).toBe("sqrt(x");
  });
  it("recovers valid settings when another saved section is corrupt", () => {
    localStorage.setItem(
      "graphite84:v1",
      JSON.stringify({
        ...initialState,
        angle: "DEG",
        history: [null],
        functions: [null, null, null, null, null, null],
      }),
    );
    expect(restoreState().angle).toBe("DEG");
    expect(restoreState().history).toEqual([]);
  });
  it("traces an enabled function when the first slot is disabled", () => {
    let s = {
      ...initialState,
      functions: initialState.functions.map((f, i) => ({
        ...f,
        enabled: i === 1,
      })),
    };
    s = key(s, "TRACE");
    expect(s.traceFunction).toBe(1);
    s = key(s, "ArrowDown");
    expect(s.traceFunction).toBe(1);
  });
  it("never bridges 80 shifted reciprocal poles", () => {
    for (let i = 0; i < 80; i++) {
      const pole = -4 + i * 0.103;
      const segments = sampleGraph(`1/(x-(${pole}))`, STANDARD, "RAD");
      for (const segment of segments)
        expect(segment[0][0] < pole && segment.at(-1)![0] > pole).toBe(false);
    }
  });
});
