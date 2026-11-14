import { describe, it, expect, beforeEach } from "vitest";
import { initialState, reducer, restoreState, type State } from "./state";
const key = (s: State, key: string) => reducer(s, { type: "key", key });
describe("calculator state", () => {
  it("continues results with Ans and recalls without evaluating twice", () => {
    let s = initialState;
    for (const k of ["2", "+", "3", "ENTER", "*", "4", "ENTER"]) s = key(s, k);
    expect(s.ans).toBe(20);
    expect(s.history).toHaveLength(2);
    s = key(s, "ENTER");
    expect(s.entry).toBe("Ans*4");
    expect(s.history).toHaveLength(2);
    s = key(s, "CLEAR");
    s = key(s, "(−)");
    expect(s.entry).toBe("-");
  });
  it("clear starts a fresh expression after a result", () => {
    let s = key({ ...initialState, entry: "3", cursor: 1 }, "ENTER");
    s = key(s, "CLEAR");
    s = key(s, "−");
    expect(s.entry).toBe("-");
  });
  it("powers off with 2nd ON and preserves calculations", () => {
    let s = key(initialState, "2ND");
    s = key(s, "ON");
    expect(s.powered).toBe(false);
    s = key(s, "3");
    expect(s.entry).toBe("");
    s = key(s, "ON");
    expect(s.powered).toBe(true);
  });
  beforeEach(() => localStorage.clear());
  it("evaluates, recalls, edits and uses Ans", () => {
    let s = { ...initialState };
    for (const k of ["2", "+", "3", "*", "4", "ENTER"]) s = key(s, k);
    expect(s.ans).toBe(14);
    s = key(s, "ArrowUp");
    s = key(s, "ENTER");
    expect(s.entry).toBe("2+3*4");
    s = key(s, "ArrowLeft");
    s = key(s, "DEL");
    expect(s.entry).toBe("2+34");
  });
  it("retains independent function fields across screens", () => {
    let s = key(initialState, "Y=");
    s = reducer(s, { type: "edit", value: "x^3", cursor: 3 });
    s = key(s, "ENTER");
    s = reducer(s, { type: "edit", value: "1/x", cursor: 3 });
    s = key(s, "GRAPH");
    s = key(s, "WINDOW");
    s = key(s, "HOME");
    expect(s.functions[0].expression).toBe("x^3");
    expect(s.functions[1].expression).toBe("1/x");
  });
  it("applies a window only when valid", () => {
    let s = key(initialState, "WINDOW");
    s = reducer(s, { type: "edit", value: "20", cursor: 2 });
    s = key(s, "GRAPH");
    expect(s.screen).toBe("window");
    expect(s.error).toContain("Invalid");
    s = reducer(s, { type: "edit", value: "-20", cursor: 3 });
    s = key(s, "GRAPH");
    expect(s.window.xmin).toBe(-20);
  });
  it("second and alpha are one-shot modes", () => {
    let s = key(initialState, "2ND");
    s = key(s, "SIN");
    expect(s.entry).toBe("asin(");
    expect(s.second).toBe(false);
    s = key(s, "ALPHA");
    s = key(s, "MATH");
    expect(s.entry).toBe("asin(A");
    expect(s.alpha).toBe(false);
  });
  it("stores Ans without executing assignments", () => {
    let s = { ...initialState, ans: 42 };
    s = key(s, "STO→");
    s = key(s, "ENTER");
    expect(s.variables.A).toBe(42);
  });
  it("restores settings and handles corrupt storage", () => {
    localStorage.setItem(
      "graphite84:v1",
      JSON.stringify({ ...initialState, angle: "DEG" }),
    );
    expect(restoreState().angle).toBe("DEG");
    localStorage.setItem("graphite84:v1", "bad");
    expect(restoreState().angle).toBe("RAD");
  });
});
