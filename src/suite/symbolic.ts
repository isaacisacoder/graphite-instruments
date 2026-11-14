import { integrate } from "./integrate";
import nerdamer from "nerdamer";
import { parse, FunctionNode, OperatorNode, ConstantNode } from "mathjs/number";
import type { MathNode, FunctionNode as FunctionType } from "mathjs";
import { compileExpression } from "../math";
import {
  num,
  integer,
  result,
  validateVariables,
  type ToolResult,
} from "./numeric";
const allowed = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sqrt",
  "log",
  "ln",
  "exp",
  "abs",
]);
function source(text: string) {
  if (!text.trim() || text.length > 240)
    throw Error("Use an expression of 1–240 characters");
  const tree = parse(text);
  let nodes = 0;
  tree.traverse((node) => {
    if (++nodes > 140) throw Error("Expression is too complex");
    if (node.type === "FunctionNode") {
      const fn = node as FunctionType;
      if (
        !allowed.has(fn.fn.name) ||
        (fn.args.length !== 1 &&
          !(fn.fn.name === "log" && fn.args.length === 2))
      )
        throw Error("Unsupported function or argument count");
    } else if (node.type === "SymbolNode") {
      const name = (node as unknown as { name: string }).name;
      if (!allowed.has(name) && !/^([a-z]|pi)$/.test(name))
        throw Error("Use single-letter variables");
    } else if (node.type === "ConstantNode") {
      if (typeof (node as unknown as { value: unknown }).value !== "number")
        throw Error("Use numeric constants");
    } else if (node.type === "OperatorNode") {
      if (
        !["+", "-", "*", "/", "^"].includes(
          (node as unknown as { op: string }).op,
        )
      )
        throw Error("Unsupported operator");
    } else if (node.type !== "ParenthesisNode")
      throw Error("Use a scalar mathematical expression");
  });
  const rewrite = (node: MathNode): MathNode => {
    const mapped = node.map((child) => rewrite(child));
    if (mapped.type === "FunctionNode") {
      const fn = mapped as FunctionType;
      if (fn.fn.name === "ln") return new FunctionNode("log", fn.args);
      if (fn.fn.name === "log")
        return new OperatorNode("/", "divide", [
          new FunctionNode("log", [fn.args[0]]),
          new FunctionNode("log", [fn.args[1] ?? new ConstantNode(10)]),
        ]);
    }
    return mapped;
  };
  return rewrite(tree).toString();
}
const display = (s: string) => s.replace(/\blog\(/g, "ln(");
export function symbolic(
  operation: string,
  f: Record<string, string>,
): ToolResult {
  const variable = f.variable || "x";
  if (!/^[xyzkt]$/.test(variable)) throw Error("Choose x, y, z, k or t");
  if (operation === "series") {
    validateVariables(f.expression, [variable]);
    const lower = integer(f.lower, "Lower index", -10000, 10000),
      upper = integer(f.upper, "Upper index", -10000, 10000);
    if (upper < lower || upper - lower > 1000)
      throw Error("Use an ordered range of at most 1001 terms");
    const fn = compileExpression(f.expression, "RAD", 0, { [variable]: 0 });
    let sum = 0;
    for (let k = lower; k <= upper; k++)
      sum += fn(variable === "x" ? k : 0, { [variable]: k });
    return result({ "Finite sum": sum });
  }
  if (operation === "definite") {
    validateVariables(f.expression, [variable]);
    const a = num(f.lower, "Lower bound"),
      b = num(f.upper, "Upper bound"),
      fn = compileExpression(f.expression, "RAD", 0, { [variable]: 0 });
    const estimate = integrate(
      (x) => fn(variable === "x" ? x : 0, { [variable]: x }),
      a,
      b,
    );
    return {
      ...result(
        { "Definite integral": estimate.value },
        "Approximate numerical integral; radians.",
      ),
      estimate: { error: estimate.error, evaluations: estimate.evaluations },
    };
  }

  let command: string;
  if (operation === "solve") {
    const sides = f.expression.split("=");
    if (sides.length > 2) throw Error("Use one equation");
    const equation =
      sides.length === 2
        ? `(${source(sides[0])})-(${source(sides[1])})`
        : source(sides[0]);
    command = `solve(${equation},${variable})`;
  } else {
    const expr = source(f.expression);
    if (operation === "limit") {
      const point = num(f.point, "Approach value"),
        left = nerdamer(`limit(${expr},${variable},${point},left)`).toString(),
        right = nerdamer(
          `limit(${expr},${variable},${point},right)`,
        ).toString();
      if (left.includes("limit(") || right.includes("limit("))
        throw Error("No closed-form limit was found");
      if (
        left !== right &&
        nerdamer(`simplify((${left})-(${right}))`).toString() !== "0"
      )
        throw Error(
          `No two-sided limit: left ${display(left)}, right ${display(right)}`,
        );
      return result(
        { Result: display(left) },
        "Two-sided limit; symbolic trigonometry uses radians.",
      );
    }
    command =
      operation === "derivative"
        ? `diff(${expr},${variable})`
        : operation === "integral"
          ? `integrate(${expr},${variable})`
          : `${operation}(${expr})`;
  }
  if (
    ![
      "simplify",
      "expand",
      "factor",
      "solve",
      "derivative",
      "integral",
      "limit",
    ].includes(operation)
  )
    throw Error("Unsupported symbolic operation");
  const answer = nerdamer(command).toString();
  if (/integrate\(|limit\(|solve\(/.test(answer))
    throw Error("No closed-form result was found for this expression");
  return result(
    {
      [operation === "integral"
        ? "Antiderivative"
        : operation === "solve"
          ? `Solutions for ${variable}`
          : "Result"]:
        display(answer) + (operation === "integral" ? " + C" : ""),
    },
    operation === "simplify"
      ? "Original domain restrictions still apply."
      : "Symbolic trigonometry uses radians.",
  );
}
