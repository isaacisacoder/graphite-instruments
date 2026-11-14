import { compileExpression, type Angle } from "./math";
export interface GraphWindow {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  xscl: number;
  yscl: number;
}
export const STANDARD: GraphWindow = {
  xmin: -10,
  xmax: 10,
  ymin: -10,
  ymax: 10,
  xscl: 2,
  yscl: 2,
};
/** Keep the world point under a gesture's anchor fixed while translating and scaling. */
export function gestureWindow(
  w: GraphWindow,
  from: Point,
  to: Point,
  factor: number,
): GraphWindow {
  factor = Math.max(0.05, Math.min(20, factor));
  const width = (w.xmax - w.xmin) * factor,
    height = (w.ymax - w.ymin) * factor;
  const anchorX = w.xmin + from[0] * (w.xmax - w.xmin),
    anchorY = w.ymax - from[1] * (w.ymax - w.ymin);
  const xmin = anchorX - to[0] * width,
    ymax = anchorY + to[1] * height;
  const scale = (span: number) => {
    const power = 10 ** Math.floor(Math.log10(span / 8)),
      n = span / 8 / power;
    return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * power;
  };
  return {
    ...w,
    xmin,
    xmax: xmin + width,
    ymin: ymax - height,
    ymax,
    xscl: factor === 1 ? w.xscl : scale(width),
    yscl: factor === 1 ? w.yscl : scale(height),
  };
}
export const COLORS = [
  "#215aab",
  "#ad3e4f",
  "#2b7855",
  "#7950a1",
  "#976112",
  "#246e7b",
];
export type Point = [number, number];
export function sampleGraph(
  expression: string,
  w: GraphWindow,
  angle: Angle,
  ans = 0,
  variables: Record<string, number> = {},
  samples = 600,
): Point[][] {
  try {
    return sampleCompiled(
      compileExpression(expression, angle, ans, variables),
      w,
      samples,
    );
  } catch {
    return [];
  }
}
export function sampleCompiled(
  fn: (x: number) => number,
  w: GraphWindow,
  samples = 600,
): Point[][] {
  const segments: Point[][] = [];
  let segment: Point[] = [];
  try {
    const span = w.ymax - w.ymin;
    let previous: Point | undefined;
    for (let i = 0; i <= samples; i++) {
      const x = w.xmin + (w.xmax - w.xmin) * (i / samples);
      let y: number;
      try {
        y = fn(x);
      } catch {
        if (segment.length > 1) segments.push(segment);
        segment = [];
        previous = undefined;
        continue;
      }
      // Midpoint error catches a pole even when it falls between sampling columns.
      let discontinuity = false;
      if (previous) {
        try {
          const mid = fn((previous[0] + x) / 2);
          discontinuity =
            Math.abs(mid - (previous[1] + (y - previous[1]) / 2)) >
              span * 0.3 || Math.abs(y - previous[1]) > span * 1.5;
        } catch {
          discontinuity = true;
        }
      }
      const relativeY = (y - w.ymin) / span;
      const nearby =
        Number.isFinite(relativeY) && relativeY >= -2 && relativeY <= 3;
      if (discontinuity || !nearby) {
        if (segment.length > 1) segments.push(segment);
        segment = [];
      }
      if (nearby) segment.push([x, y]);
      previous = [x, y];
    }
    if (segment.length > 1) segments.push(segment);
  } catch {
    return [];
  }
  return segments;
}
export function validWindow(value: unknown): value is GraphWindow {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  if (
    !["xmin", "xmax", "ymin", "ymax", "xscl", "yscl"].every(
      (k) => typeof record[k] === "number" && Number.isFinite(record[k]),
    )
  )
    return false;
  const w = value as GraphWindow;
  return (
    Number.isFinite(w.xmax - w.xmin) &&
    Number.isFinite(w.ymax - w.ymin) &&
    w.xmax > w.xmin &&
    w.ymax > w.ymin &&
    w.xscl > 0 &&
    w.yscl > 0 &&
    Math.abs(w.xmax - w.xmin) > 1e-10 &&
    Math.abs(w.ymax - w.ymin) > 1e-10
  );
}
export function zoomWindow(w: GraphWindow, factor: number): GraphWindow {
  const cx = w.xmin + (w.xmax - w.xmin) / 2,
    cy = w.ymin + (w.ymax - w.ymin) / 2,
    dx = ((w.xmax - w.xmin) * factor) / 2,
    dy = ((w.ymax - w.ymin) * factor) / 2;
  return {
    ...w,
    xmin: cx - dx,
    xmax: cx + dx,
    ymin: cy - dy,
    ymax: cy + dy,
    xscl: w.xscl * factor,
    yscl: w.yscl * factor,
  };
}
