import { describe, it, expect } from "vitest";
import { evaluate } from "./math";
describe("numeric expressions", () => {
  it("validates arity and supports arbitrary logarithm bases", () => {
    expect(() => evaluate("sin(1,2)", "RAD")).toThrow();
    expect(evaluate("log(8,2)", "RAD")).toBe(3);
  });
  it("rejects fractional and overflowing factorials", () => {
    expect(() => evaluate("3.5!", "RAD")).toThrow();
    expect(() => evaluate("171!", "RAD")).toThrow();
  });
  it.each([
    ["2+3*4", 14],
    ["(2+3)*4", 20],
    ["2^3", 8],
    ["-2^2", -4],
    ["2-(-3)", 5],
    ["sqrt(9)+log(100)+ln(e)", 6],
    ["5!", 120],
    ["1e-20", 1e-20],
    ["2pi", 2 * Math.PI],
  ])("%s", (expression, result) =>
    expect(evaluate(expression, "RAD")).toBeCloseTo(result, 12),
  );
  it("respects angle mode and inverse trig", () => {
    expect(evaluate("sin(30)", "DEG")).toBeCloseTo(0.5, 12);
    expect(evaluate("sin(pi/2)", "RAD")).toBe(1);
    expect(evaluate("asin(.5)", "DEG")).toBeCloseTo(30, 12);
  });
  it("uses answer and stored variables", () =>
    expect(evaluate("Ans+A", "RAD", 4, { A: 3 })).toBe(7));
  it.each([
    "1/0",
    "sqrt(-1)",
    "ln(0)",
    "acos(2)",
    "tan(90)",
    "2+",
    "a=3",
    'import("x")',
    "[1,2]",
    "pi.constructor",
    "x[0]",
  ])("rejects %s", (expression) =>
    expect(() => evaluate(expression, "DEG")).toThrow(),
  );
});
