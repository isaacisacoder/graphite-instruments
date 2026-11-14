import { normalTail } from "./normalTail";
import {
  num,
  integer,
  values,
  pairs,
  result,
  finite,
  type ToolResult,
} from "./numeric";
import { combinatoric } from "./discrete";
export function stats(
  operation: string,
  f: Record<string, string>,
): ToolResult {
  if (operation === "combinations" || operation === "permutations")
    return result({
      [operation === "combinations" ? "nCr" : "nPr"]: combinatoric(
        integer(f.n, "n", 0, 500),
        integer(f.r, "r", 0, 500),
        operation === "permutations",
      ),
    });
  if (operation === "normal") {
    const mean = num(f.mean, "Mean"),
      sd = num(f.sd, "Standard deviation", Number.MIN_VALUE),
      x = num(f.x, "x"),
      z = (x - mean) / sd;
    const tail = normalTail(z),
      cdf = z < 0 ? tail : 1 - tail,
      pdf = Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
    return result(
      {
        "z score": z,
        Density: pdf,
        "P(X ≤ x)": cdf,
        "P(X > x)": z >= 0 ? tail : 1 - tail,
      },
      "Normal CDF uses a numerical approximation.",
    );
  }
  if (operation === "regression") {
    const data = pairs(f.data),
      n = data.length,
      mx = data.reduce((s, p) => s + p[0] / n, 0),
      my = data.reduce((s, p) => s + p[1] / n, 0);
    let xx = 0,
      xy = 0,
      yy = 0;
    for (const [x, y] of data) {
      xx += (x - mx) ** 2;
      xy += (x - mx) * (y - my);
      yy += (y - my) ** 2;
    }
    if (xx === 0) throw Error("x values must vary");
    const slope = finite(xy / xx),
      intercept = finite(my - slope * mx);
    return result({
      Slope: slope,
      Intercept: intercept,
      "R²":
        yy === 0
          ? "Undefined (constant y)"
          : Math.max(0, Math.min(1, (xy / Math.sqrt(xx) / Math.sqrt(yy)) ** 2)),
      Count: n,
    });
  }
  const data = values(f.data),
    sorted = [...data].sort((a, b) => a - b),
    n = data.length;
  let mean = 0,
    m2 = 0;
  data.forEach((x, i) => {
    const delta = x - mean;
    mean += delta / (i + 1);
    m2 += delta * (x - mean);
  });
  const quantile = (p: number) => {
    const index = (n - 1) * p,
      low = Math.floor(index);
    return (
      sorted[low] + (sorted[Math.ceil(index)] - sorted[low]) * (index - low)
    );
  };
  return result({
    Count: n,
    Mean: mean,
    Median: quantile(0.5),
    "Population variance": m2 / n,
    "Population standard deviation": Math.sqrt(m2 / n),
    "Sample standard deviation":
      n > 1 ? Math.sqrt(m2 / (n - 1)) : "Requires 2 values",
    Minimum: sorted[0],
    Maximum: sorted[n - 1],
    Q1: quantile(0.25),
    Q3: quantile(0.75),
  });
}
