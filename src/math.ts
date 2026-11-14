import { parse, format, FunctionNode } from "mathjs/number";
import type { MathNode, OperatorNode } from "mathjs";
export type Angle = "DEG" | "RAD";
const functions = new Set([
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
]);
const operators = new Set(["+", "-", "*", "/", "^", "!", "%"]);
export class CalcError extends Error {}
export function compileExpression(
  expression: string,
  angle: Angle,
  ans = 0,
  variables: Record<string, number> = {},
) {
  if (expression.length > 512) throw new CalcError("Expression too long");
  let tree: MathNode;
  try {
    tree = parse(
      expression
        .replaceAll("−", "-")
        .replaceAll("×", "*")
        .replaceAll("÷", "/")
        .replaceAll("π", "pi")
        .replaceAll("Ans", "ans"),
    );
  } catch {
    throw new CalcError("Syntax error — check expression");
  }
  tree.traverse((node) => {
    if (
      node.type === "ConstantNode" &&
      typeof (node as unknown as { value: unknown }).value !== "number"
    )
      throw new CalcError("Use numeric constants");
    if (node.type === "FunctionNode") {
      const { name, args } = node as unknown as {
        name: string;
        args: MathNode[];
      };
      if (!functions.has(name)) throw new CalcError("Unsupported function");
      if (args.length !== 1 && !(name === "log" && args.length === 2))
        throw new CalcError("Syntax error — check function arguments");
    } else if (node.type === "OperatorNode") {
      if (!operators.has((node as unknown as { op: string }).op))
        throw new CalcError("Unsupported operator");
    } else if (node.type === "SymbolNode") {
      const name = (node as unknown as { name: string }).name;
      if (
        !functions.has(name) &&
        !["x", "pi", "e", "ans", ...Object.keys(variables)].includes(name)
      )
        throw new CalcError(`Unknown variable: ${name}`);
    } else if (!["ConstantNode", "ParenthesisNode"].includes(node.type))
      throw new CalcError("Use a numeric expression");
  });
  const factor = angle === "DEG" ? Math.PI / 180 : 1;
  type NumericFunction = (...args: number[]) => number;
  const scope: Record<string, number | NumericFunction> = {
    pi: Math.PI,
    e: Math.E,
    ans,
    ...variables,
    sin: (n) => Math.sin(n * factor),
    cos: (n) => Math.cos(n * factor),
    tan: (n) => {
      if (Math.abs(Math.cos(n * factor)) < 1e-14)
        throw new CalcError("Domain error");
      return Math.tan(n * factor);
    },
    asin: (n) => Math.asin(n) / factor,
    acos: (n) => Math.acos(n) / factor,
    atan: (n) => Math.atan(n) / factor,
    log: (n, base) => {
      if (base !== undefined && (base <= 0 || base === 1))
        throw new CalcError("Invalid logarithm base");
      return base === undefined ? Math.log10(n) : Math.log(n) / Math.log(base);
    },
    ln: Math.log,
    sqrt: Math.sqrt,
    abs: Math.abs,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    factorial: (n) => {
      if (!Number.isInteger(n) || n < 0 || n > 170)
        throw new CalcError("Factorial requires an integer from 0 to 170");
      let value = 1;
      for (let i = 2; i <= n; i++) value *= i;
      return value;
    },
    _add: (a, b) => a + b,
    _subtract: (a, b) => a - b,
    _multiply: (a, b) => a * b,
    _divide: (a, b) => {
      if (b === 0) throw new CalcError("Division by zero");
      return a / b;
    },
    _power: Math.pow,
    _positive: (n) => n,
    _negative: (n) => -n,
    _mod: (a, b) => {
      const r = a % b;
      return r === 0 ? 0 : Math.sign(r) === Math.sign(b) ? r : r + b;
    },
  };
  // Validate every operation, so a later power or reciprocal cannot hide NaN or overflow.
  for (const [name, value] of Object.entries(scope))
    if (typeof value === "function")
      scope[name] = (...args) => {
        if (!args.every(Number.isFinite))
          throw new CalcError("Domain error — non-finite input");
        const result = value(...args);
        if (!Number.isFinite(result))
          throw new CalcError("Domain error — undefined result or overflow");
        return result;
      };
  const operationNames: Record<string, string> = {
    add: "_add",
    subtract: "_subtract",
    multiply: "_multiply",
    divide: "_divide",
    pow: "_power",
    unaryPlus: "_positive",
    unaryMinus: "_negative",
    mod: "_mod",
    factorial: "factorial",
  };
  const rewrite = (node: MathNode): MathNode => {
    const mapped = node.map((child) => rewrite(child));
    return mapped.type === "OperatorNode"
      ? new FunctionNode(
          operationNames[(mapped as OperatorNode).fn],
          (mapped as OperatorNode).args,
        )
      : mapped;
  };
  const code = rewrite(tree).compile();
  return (x = 0, bindings: Record<string, number> = {}): number => {
    let result: unknown;
    try {
      result = code.evaluate({ ...scope, ...bindings, x });
    } catch (error) {
      if (error instanceof CalcError) throw error;
      throw new CalcError("Domain error — undefined result");
    }
    if (typeof result !== "number" || !Number.isFinite(result))
      throw new CalcError("Domain error — undefined result");
    return Object.is(result, -0) ? 0 : result;
  };
}
export function evaluate(
  expression: string,
  angle: Angle,
  ans = 0,
  variables: Record<string, number> = {},
) {
  return compileExpression(expression, angle, ans, variables)();
}
export function numberText(n: number) {
  return format(n, { precision: 12, lowerExp: -8, upperExp: 12 });
}
