import { describe, it, expect } from "vitest";
import { finance } from "./financial";
import { stats } from "./statistics";
import { discrete, gcd } from "./discrete";
import { matrix, multiply, elimination } from "./numeric";
import { symbolic } from "./symbolic";
import { compileExpression } from "../math";
const value = (
  r: { items: { label: string; value: string }[] },
  label: string,
) => r.items.find((item) => item.label === label)!.value;
describe("financial tools", () => {
  it("solves exact zero interest and rejects precision-lost amortization", () => {
    expect(
      value(
        finance("rate", {
          principal: "10000",
          months: "36",
          payment: "10000/36",
        }),
        "Annual nominal rate (%)",
      ),
    ).toBe("0");
    expect(() =>
      finance("loan", {
        principal: "10000",
        months: "1200",
        rate: "1000",
        extra: "0",
      }),
    ).toThrow();
  });
  const loan = { principal: "10000", rate: "5", months: "36", extra: "0" };
  it("computes loan payment and reconciles amortization", () => {
    const r = finance("loan", loan);
    expect(Number(value(r, "Monthly payment"))).toBeCloseTo(299.7089710467, 8);
    expect(Number(value(r, "Total paid"))).toBeCloseTo(
      10000 + Number(value(r, "Total interest")),
      6,
    );
    expect(r.table!.rows).toHaveLength(36);
    expect(r.table!.rows.at(-1)!.at(-1)).toBe("0.00");
  });
  it("handles zero interest and extra payments", () => {
    expect(
      Number(value(finance("loan", { ...loan, rate: "0" }), "Monthly payment")),
    ).toBeCloseTo(10000 / 36, 8);
    expect(
      finance("loan", { ...loan, extra: "100" }).table!.rows.length,
    ).toBeLessThan(36);
  });
  it("computes compound growth", () =>
    expect(
      Number(
        value(
          finance("growth", {
            principal: "10000",
            rate: "5",
            years: "10",
            periods: "1",
            contribution: "0",
          }),
          "Future value",
        ),
      ),
    ).toBeCloseTo(10000 * 1.05 ** 10, 6));
  it("matches monthly contributions against an independent period loop", () => {
    let balance = 1000;
    for (let i = 0; i < 24; i++) balance = balance * (1 + 0.06 / 12) + 50;
    expect(
      Number(
        value(
          finance("growth", {
            principal: "1000",
            rate: "6",
            years: "2",
            periods: "12",
            contribution: "50",
          }),
          "Future value",
        ),
      ),
    ).toBeCloseTo(balance, 7);
  });
  it("solves nominal annual interest rate", () =>
    expect(
      Number(
        value(
          finance("rate", { ...loan, payment: "299.7089710467" }),
          "Annual nominal rate (%)",
        ),
      ),
    ).toBeCloseTo(5, 8));
  it.each([
    { ...loan, months: "0" },
    { ...loan, rate: "-1" },
    { ...loan, principal: "0" },
  ])("rejects invalid loans", (fields) =>
    expect(() => finance("loan", fields)).toThrow(),
  );
});
describe("statistics and discrete tools", () => {
  it("computes regression correlation without squaring overflowing intermediates", () => {
    expect(
      value(
        stats("regression", { data: "1e99,2e99\n2e99,4e99\n3e99,6e99" }),
        "R²",
      ),
    ).toBe("1");
  });
  it("computes sample and population standard deviations", () => {
    const r = stats("summary", { data: "1,2,3,4,5" });
    expect(Number(value(r, "Mean"))).toBe(3);
    expect(Number(value(r, "Population variance"))).toBe(2);
    expect(Number(value(r, "Sample standard deviation"))).toBeCloseTo(
      Math.sqrt(2.5),
      10,
    );
  });
  it("fits a linear regression", () => {
    const r = stats("regression", { data: "1,2\n2,4\n3,6" });
    expect(value(r, "Slope")).toBe("2");
    expect(value(r, "Intercept")).toBe("0");
    expect(value(r, "R²")).toBe("1");
  });
  it("computes normal distribution probabilities", () => {
    expect(
      Number(
        value(stats("normal", { mean: "0", sd: "1", x: "0" }), "P(X ≤ x)"),
      ),
    ).toBe(0.5);
    expect(
      Number(
        value(stats("normal", { mean: "0", sd: "1", x: "1.96" }), "P(X ≤ x)"),
      ),
    ).toBeCloseTo(0.9750021, 6);
  });
  it("rejects invalid normal distributions and regression data", () => {
    expect(() => stats("normal", { mean: "0", sd: "0", x: "1" })).toThrow();
    expect(() => stats("regression", { data: "1,2\n1,3" })).toThrow();
  });
  it("keeps large integer gcd and lcm exact", () => {
    expect(gcd(12345678901234567890n, 30n)).toBe(30n);
    const r = discrete("gcd", { a: "84", b: "30" });
    expect(value(r, "GCD")).toBe("6");
    expect(value(r, "LCM")).toBe("420");
  });
  it("factors integers and detects primes", () => {
    expect(value(discrete("factor", { a: "84" }), "Prime factorization")).toBe(
      "2^2 × 3 × 7",
    );
    expect(value(discrete("factor", { a: "97" }), "Prime")).toBe("Yes");
  });
  it("computes combinations and permutations exactly", () => {
    expect(value(discrete("combinations", { n: "10", r: "3" }), "nCr")).toBe(
      "120",
    );
    expect(value(discrete("permutations", { n: "10", r: "3" }), "nPr")).toBe(
      "720",
    );
    expect(() => discrete("combinations", { n: "2", r: "3" })).toThrow();
  });
});
describe("matrix operations", () => {
  it("computes determinants, inverses and products", () => {
    const a = matrix("1,2\n3,4"),
      r = elimination(a, true);
    expect(r.determinant).toBeCloseTo(-2, 10);
    const identity = multiply(a, r.inverse);
    expect(identity[0][0]).toBeCloseTo(1, 10);
    expect(identity[0][1]).toBeCloseTo(0, 10);
    expect(identity[1][1]).toBeCloseTo(1, 10);
  });
  it("handles pivot row swaps and singularity", () => {
    expect(elimination(matrix("0,1\n1,0")).determinant).toBe(-1);
    expect(() => elimination(matrix("1,2\n2,4"), true)).toThrow();
  });
  it("rejects incompatible and ragged matrices", () => {
    expect(() => matrix("1,2\n3")).toThrow();
    expect(() => multiply([[1, 2]], [[1, 2]])).toThrow();
  });
});
describe("symbolic and calculus tools", () => {
  it("does not silently substitute zero for unassigned numeric parameters", () => {
    expect(() =>
      symbolic("definite", {
        expression: "x",
        variable: "t",
        lower: "0",
        upper: "1",
      }),
    ).toThrow("Unassigned variable");
    expect(() =>
      symbolic("series", {
        expression: "Ans",
        variable: "k",
        lower: "1",
        upper: "3",
      }),
    ).toThrow("Unassigned variable");
    expect(() =>
      finance("growth", {
        principal: "x",
        rate: "5",
        years: "10",
        periods: "1",
        contribution: "0",
      }),
    ).toThrow("Unassigned variable");
  });
  it("does not report a false two-sided limit at a jump", () =>
    expect(() =>
      symbolic("limit", { expression: "abs(x)/x", variable: "x", point: "0" }),
    ).toThrow("No two-sided limit"));
  it("integrates a supported endpoint cusp", () =>
    expect(
      Number(
        value(
          symbolic("definite", {
            expression: "sqrt(x)",
            variable: "x",
            lower: "0",
            upper: "1",
          }),
          "Definite integral",
        ),
      ),
    ).toBeCloseTo(2 / 3, 8));
  it("factors and expands exact algebra", () => {
    const f = value(symbolic("factor", { expression: "x^2-1" }), "Result");
    expect(compileExpression(f, "RAD")(3)).toBe(8);
    const e = value(symbolic("expand", { expression: "(x+1)^3" }), "Result");
    expect(compileExpression(e, "RAD")(2)).toBe(27);
  });
  it("solves in exact form", () => {
    const r = value(
      symbolic("solve", { expression: "x^2=2", variable: "x" }),
      "Solutions for x",
    );
    expect(r).toContain("2^(1/2)");
  });
  it("differentiates and integrates polynomials", () => {
    const d = value(
      symbolic("derivative", { expression: "x^3", variable: "x" }),
      "Result",
    );
    expect(compileExpression(d, "RAD")(2)).toBe(12);
    const integral = value(
      symbolic("integral", { expression: "x^2", variable: "x" }),
      "Antiderivative",
    );
    expect(integral).toContain("+ C");
    expect(compileExpression(integral.replace(" + C", ""), "RAD")(3)).toBe(9);
  });
  it("handles logarithm conventions", () => {
    const d = value(
      symbolic("derivative", { expression: "ln(x)", variable: "x" }),
      "Result",
    );
    expect(compileExpression(d, "RAD")(2)).toBe(0.5);
  });
  it("computes definite integrals, limits and finite sums", () => {
    expect(
      Number(
        value(
          symbolic("definite", {
            expression: "x^2",
            variable: "x",
            lower: "0",
            upper: "1",
          }),
          "Definite integral",
        ),
      ),
    ).toBeCloseTo(1 / 3, 9);
    expect(
      value(
        symbolic("limit", {
          expression: "sin(x)/x",
          variable: "x",
          point: "0",
        }),
        "Result",
      ),
    ).toBe("1");
    expect(
      value(
        symbolic("series", {
          expression: "k^2",
          variable: "k",
          lower: "1",
          upper: "10",
        }),
        "Finite sum",
      ),
    ).toBe("385");
  });
  it("rejects unsafe or unsupported expressions and singular integrals", () => {
    expect(() => symbolic("factor", { expression: "a=2" })).toThrow();
    expect(() => symbolic("simplify", { expression: 'import("x")' })).toThrow();
    expect(() =>
      symbolic("definite", {
        expression: "1/x",
        variable: "x",
        lower: "-1",
        upper: "1",
      }),
    ).toThrow();
  });
});
