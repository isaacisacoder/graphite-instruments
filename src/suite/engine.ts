import { factorize } from "./lu";
import { finance } from "./financial";
import { stats } from "./statistics";
import { discrete } from "./discrete";
import {
  matrix,
  values,
  multiply,
  elimination,
  matrixResult,
  result,
  finite,
  type ToolResult,
} from "./numeric";
export async function calculate(
  tool: string,
  operation: string,
  fields: Record<string, string>,
): Promise<ToolResult> {
  if (tool === "financial") return finance(operation, fields);
  if (tool === "statistics") return stats(operation, fields);
  if (tool === "discrete") return discrete(operation, fields);
  if (tool === "cas" || tool === "calculus")
    return (await import("./symbolic")).symbolic(operation, fields);
  if (tool === "matrix") {
    if (operation === "dot" || operation === "cross") {
      const a = values(fields.a),
        b = values(fields.b);
      if (a.length !== b.length || a.length > 6)
        throw Error("Use vectors of the same length, up to 6 values");
      if (operation === "dot")
        return result({
          "Dot product": finite(a.reduce((sum, n, i) => sum + n * b[i], 0)),
        });
      if (a.length !== 3)
        throw Error("Cross product requires 3-dimensional vectors");
      return result({
        "Cross product": `[${[a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]].map(finite).join(", ")}]`,
      });
    }
    const a = matrix(fields.a);
    if (operation === "determinant") {
      const f = factorize(a);
      return {
        ...result({ Determinant: f.determinant }),
        warnings: f.warning ? [f.warning] : undefined,
      };
    }
    if (operation === "inverse") {
      const f = elimination(a, true);
      return {
        ...matrixResult(f.inverse),
        warnings: f.warning ? [f.warning] : undefined,
      };
    }
    if (operation === "transpose")
      return matrixResult(a[0].map((_, j) => a.map((row) => row[j])));
    if (operation === "multiply")
      return matrixResult(multiply(a, matrix(fields.b)));
    if (operation === "solve") {
      const b = values(fields.b);
      if (a.length !== b.length)
        throw Error("Provide one b value per equation");
      const f = factorize(a);
      return {
        ...matrixResult(f.solve(b).map((n) => [n])),
        warnings: f.warning ? [f.warning] : undefined,
      };
    }
  }
  throw Error("Unsupported operation");
}
