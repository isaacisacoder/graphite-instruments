import { it, expect } from "vitest";
import { symbolic } from "./suite/symbolic";
import { elimination, matrix } from "./suite/numeric";
import { stats } from "./suite/statistics";
import { initialState, reducer } from "./state";
it("integrates oscillations without accepting aliased zero", () => {
  const r = symbolic("definite", {
    expression: "sin(100*pi*x)^2",
    variable: "x",
    lower: "0",
    upper: "1",
  });
  expect(Number(r.items[0].value)).toBeCloseTo(0.5, 9);
});
it("keeps a scaled nonsingular determinant", () => {
  expect(elimination(matrix("1e16,0;0,1")).determinant / 1e16).toBeCloseTo(
    1,
    12,
  );
});
it("preserves tiny positive normal survival probabilities", () => {
  const r = stats("normal", { mean: "0", sd: "1", x: "10" });
  expect(
    Number(r.items.find((i) => i.label === "P(X > x)")!.value),
  ).toBeGreaterThan(0);
});

it("replaces and deletes a selection without altering adjacent text", () => {
  let s = reducer(initialState, {
    type: "edit",
    value: "1234",
    cursor: 1,
    selectionEnd: 3,
  });
  s = reducer(s, { type: "key", key: "9" });
  expect(s.entry).toBe("194");
  s = reducer(s, { type: "edit", value: "1234", cursor: 1, selectionEnd: 3 });
  expect(reducer(s, { type: "key", key: "DEL" }).entry).toBe("14");
});
