import { compileExpression, type Angle } from "../math";
import { integrate } from "./integrate";
import type { Point } from "../plot";
export type AnalysisOperation =
  "roots" | "intersection" | "minimum" | "maximum" | "integral";
export interface AnalysisRequest {
  id: string;
  operation: AnalysisOperation;
  expression: string;
  other: string;
  angle: Angle;
  parameters: Record<string, number>;
  lower: number;
  upper: number;
}
export interface AnalysisResult {
  points: Point[];
  value?: number;
  error?: number;
  message: string;
}
function golden(f: (x: number) => number, a: number, b: number) {
  const ratio = (Math.sqrt(5) - 1) / 2;
  let c = b - ratio * (b - a),
    d = a + ratio * (b - a),
    fc = f(c),
    fd = f(d);
  for (
    let i = 0;
    i < 90 && b - a > 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
    i++
  ) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - ratio * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + ratio * (b - a);
      fd = f(d);
    }
  }
  return (a + b) / 2;
}
export function analyze(r: AnalysisRequest): AnalysisResult {
  const { lower: a, upper: b } = r;
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    a >= b ||
    !Number.isFinite(b - a)
  )
    throw Error("Use finite, ordered interval bounds");
  const f = compileExpression(r.expression, r.angle, 0, r.parameters);
  if (r.operation === "integral") {
    const estimate = integrate(f, a, b);
    return {
      points: [],
      value: estimate.value,
      error: estimate.error,
      message: "Approximate integral; estimated absolute error shown.",
    };
  }
  const other =
      r.operation === "intersection"
        ? compileExpression(r.other, r.angle, 0, r.parameters)
        : null,
    g = (x: number) => f(x) - (other ? other(x) : 0),
    count = 1024,
    step = (b - a) / count,
    points: Point[] = [];
  const sample = (x: number) => {
    try {
      return g(x);
    } catch {
      return NaN;
    }
  };
  const add = (x: number) => {
    try {
      const y = f(x);
      if (
        Number.isFinite(y) &&
        !points.some(
          (p) => Math.abs(p[0] - x) < 1e-6 * Math.max(1, Math.abs(x)),
        )
      )
        points.push([x, y]);
    } catch {
      /* Undefined points are excluded. */
    }
  };
  const finiteSamples = Array.from({ length: count + 1 }, (_, i) =>
      sample(a + i * step),
    ).filter(Number.isFinite),
    scale = Math.max(0, ...finiteSamples.map(Math.abs)),
    tolerance = Math.max(Number.MIN_VALUE, scale * 1e-9);
  if (
    (r.operation === "roots" || r.operation === "intersection") &&
    finiteSamples.length === count + 1 &&
    scale === 0
  )
    return {
      points: [],
      message:
        "Every sampled value agrees with zero; isolated solutions cannot be identified.",
    };
  if (r.operation === "roots" || r.operation === "intersection") {
    let prev = sample(a);
    for (let i = 1; i <= count; i++) {
      const x = a + i * step,
        y = sample(x),
        lo = x - step;
      if (Number.isFinite(prev) && Number.isFinite(y)) {
        if (prev === 0) add(lo);
        if (Math.sign(prev) !== Math.sign(y)) {
          let l = lo,
            h = x,
            fl = prev;
          for (let k = 0; k < 70; k++) {
            const mid = l + (h - l) / 2,
              v = sample(mid);
            if (!Number.isFinite(v)) break;
            if (Math.sign(v) === Math.sign(fl)) {
              l = mid;
              fl = v;
            } else h = mid;
          }
          const root = l + (h - l) / 2;
          if (Math.abs(sample(root)) <= tolerance) add(root);
        }
        if (i > 1) {
          const before = sample(lo - step);
          if (
            Math.abs(prev) < Math.abs(before) &&
            Math.abs(prev) < Math.abs(y)
          ) {
            const root = golden((v) => Math.abs(sample(v)), lo - step, x);
            if (Math.abs(sample(root)) <= tolerance) add(root);
          }
        }
      }
      prev = y;
      if (points.length >= 50) break;
    }
    if (Math.abs(sample(b)) <= tolerance) add(b);
  } else {
    const direction = r.operation === "maximum" ? -1 : 1;
    let left = sample(a),
      middle = sample(a + step);
    for (let i = 2; i <= count; i++) {
      const right = sample(a + i * step);
      if (
        [left, middle, right].every(Number.isFinite) &&
        direction * middle < direction * left &&
        direction * middle < direction * right
      ) {
        const x = golden(
            (v) => direction * sample(v),
            a + (i - 2) * step,
            a + i * step,
          ),
          h = step * 0.001,
          center = sample(x);
        if (
          Number.isFinite(center) &&
          direction * center <= direction * sample(x - h) &&
          direction * center <= direction * sample(x + h)
        )
          add(x);
      }
      left = middle;
      middle = right;
      if (points.length >= 50) break;
    }
  }
  return {
    points,
    message: points.length
      ? `Approximate candidates; refinement tolerance scales with x (1e-10). Narrow features may be missed.`
      : "No bounded candidate found. Try a smaller interval.",
  };
}
