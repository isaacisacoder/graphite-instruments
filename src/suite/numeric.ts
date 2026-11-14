import { parseMatrixText } from "./delimited";
import { factorize } from "./lu";
import { evaluate, numberText } from "../math";
import { parse } from "mathjs/number";
export function validateVariables(
  expression: string,
  variables: string[] = [],
) {
  const constantsAndFunctions = new Set([
    "pi",
    "e",
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
    "sqrt",
    "log",
    "ln",
    "abs",
    "exp",
    "floor",
    "ceil",
    "round",
    "factorial",
    ...variables,
  ]);
  parse(expression).traverse((node) => {
    if (node.type === "SymbolNode") {
      const name = (node as unknown as { name: string }).name;
      if (!constantsAndFunctions.has(name))
        throw Error(`Unassigned variable: ${name}`);
    }
  });
}
export interface ToolResult {
  items: { label: string; value: string }[];
  table?: { headers: string[]; rows: string[][] };
  note?: string;
  warnings?: string[];
  estimate?: { error: number; evaluations: number };
}
export const result = (
  values: Record<string, number | string>,
  note?: string,
): ToolResult => ({
  items: Object.entries(values).map(([label, value]) => ({
    label,
    value: typeof value === "number" ? numberText(finite(value)) : value,
  })),
  note,
});
export function finite(n: number): number {
  if (!Number.isFinite(n)) throw Error("Result exceeds numeric range");
  return Object.is(n, -0) ? 0 : n;
}
export function num(
  value: string,
  label: string,
  min = -Infinity,
  max = Infinity,
) {
  if (!value.trim()) throw Error(`Enter ${label.toLowerCase()}`);
  validateVariables(value);
  const n = evaluate(value, "RAD");
  if (n < min || n > max)
    throw Error(`${label} must be between ${min} and ${max}`);
  return n;
}
export function integer(
  value: string,
  label: string,
  min: number,
  max: number,
) {
  const n = num(value, label, min, max);
  if (!Number.isInteger(n)) throw Error(`${label} must be an integer`);
  return n;
}
export function values(value: string): number[] {
  const tokens = value.trim().split(/[\s,;]+/);
  if (!value.trim() || tokens.length > 1000)
    throw Error("Enter 1–1000 numeric values");
  return tokens.map((token) => num(token, "Value", -1e100, 1e100));
}
export function pairs(text: string): [number, number][] {
  const rows = text
    .trim()
    .split(/[\n;]+/)
    .map((row) => values(row));
  if (
    rows.length < 2 ||
    rows.length > 500 ||
    rows.some((row) => row.length !== 2)
  )
    throw Error("Enter 2–500 rows, each containing x, y");
  return rows.map((row) => [row[0], row[1]]);
}
export function matrix(text: string): number[][] {
  const rows = parseMatrixText(text).map((r) =>
    r.map((v) => num(v, "Value", -1e100, 1e100)),
  );
  if (!rows.length || !rows[0].length) throw Error("Enter a matrix");
  if (
    rows.length > 6 ||
    rows[0].length > 6 ||
    rows.some((row) => row.length !== rows[0].length)
  )
    throw Error("Use a rectangular matrix up to 6 × 6");
  return rows;
}
export function multiply(a: number[][], b: number[][]) {
  if (a[0].length !== b.length)
    throw Error("Columns of A must equal rows of B");
  return a.map((row) =>
    b[0].map((_, j) => finite(row.reduce((sum, n, k) => sum + n * b[k][j], 0))),
  );
}
export function elimination(a: number[][], invert = false) {
  const f = factorize(a);
  if (!invert) finite(f.determinant);
  if (invert && f.singular) throw Error("Matrix is singular");
  const columns = invert
    ? a.map((_, j) => f.solve(a.map((_, i) => (i === j ? 1 : 0))))
    : [];
  return {
    determinant: f.determinant,
    inverse: invert ? a.map((_, i) => columns.map((c) => c[i])) : [],
    warning: f.warning,
  };
}
export function matrixResult(a: number[][]): ToolResult {
  return {
    items: [{ label: "Dimensions", value: `${a.length} × ${a[0].length}` }],
    table: {
      headers: a[0].map((_, i) => String(i + 1)),
      rows: a.map((row) => row.map(numberText)),
    },
  };
}
