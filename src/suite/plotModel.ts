import { validateVariables } from "./numeric";
import { compileExpression, type Angle } from "../math";
import { STANDARD, validWindow, type GraphWindow, type Point } from "../plot";
export interface Curve {
  id: string;
  expression: string;
  enabled: boolean;
}
export interface PointRow {
  id: string;
  x: string;
  y: string;
}
export interface Parameter {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}
export interface PlotDraft {
  version: 2;
  equalUnits: boolean;
  snap: boolean;
  parameters: Parameter[];
  curves: Curve[];
  points: PointRow[];
  window: GraphWindow;
  labels: boolean;
  degrees: boolean;
}
export const INITIAL_PLOT: PlotDraft = {
  version: 2,
  equalUnits: true,
  snap: false,
  parameters: [],
  curves: [
    { id: "y1", expression: "x^2", enabled: true },
    { id: "y2", expression: "", enabled: true },
  ],
  points: [
    { id: "p1", x: "-2", y: "4" },
    { id: "p2", x: "0", y: "0" },
    { id: "p3", x: "2", y: "4" },
  ],
  window: STANDARD,
  labels: true,
  degrees: false,
};
export function restorePlot(raw: string | null): PlotDraft {
  try {
    const d: unknown = JSON.parse(raw ?? "null");
    if (!d || typeof d !== "object") return INITIAL_PLOT;
    const v = d as Partial<PlotDraft>;
    return {
      version: 2,
      equalUnits: v.equalUnits === true,
      snap: v.snap === true,
      parameters: Array.isArray(v.parameters)
        ? v.parameters.filter(validParameter).slice(0, 24)
        : [],
      curves:
        Array.isArray(v.curves) && v.curves.length
          ? v.curves
              .slice(0, 12)
              .filter(
                (c) =>
                  c &&
                  typeof c.expression === "string" &&
                  typeof c.enabled === "boolean",
              )
              .map((c, i) => ({
                ...c,
                id: typeof c.id === "string" ? c.id : `y${i + 1}`,
                expression: c.expression.slice(0, 240),
              }))
          : INITIAL_PLOT.curves,
      points: Array.isArray(v.points)
        ? v.points
            .slice(0, 200)
            .filter(
              (p) => p && typeof p.x === "string" && typeof p.y === "string",
            )
            .map((p, i) => ({
              id: typeof p.id === "string" ? p.id : `p${i + 1}`,
              x: p.x.slice(0, 80),
              y: p.y.slice(0, 80),
            }))
        : [],
      window: validWindow(v.window) ? v.window : STANDARD,
      labels: v.labels !== false,
      degrees: v.degrees === true,
    };
  } catch {
    return INITIAL_PLOT;
  }
}
const pointCache = new Map<
  string,
  (variables: Record<string, number>) => Point | null
>();
export function readPoint(
  row: Pick<PointRow, "x" | "y">,
  angle: Angle = "RAD",
  variables: Record<string, number> = {},
): Point | null {
  if (!row.x.trim() || !row.y.trim()) return null;
  const names = Object.keys(variables).sort(),
    key = JSON.stringify([row.x, row.y, angle, names]);
  let fn = pointCache.get(key);
  if (!fn) {
    try {
      for (const source of [row.x, row.y])
        validateVariables(
          source
            .replaceAll("π", "pi")
            .replaceAll("−", "-")
            .replaceAll("×", "*")
            .replaceAll("÷", "/"),
          names,
        );
      const placeholders = Object.fromEntries(names.map((n) => [n, 0])),
        x = compileExpression(row.x, angle, 0, placeholders),
        y = compileExpression(row.y, angle, 0, placeholders);
      fn = (v) => {
        try {
          return [x(0, v), y(0, v)];
        } catch {
          return null;
        }
      };
    } catch {
      fn = () => null;
    }
    if (pointCache.size >= 512)
      pointCache.delete(pointCache.keys().next().value!);
    pointCache.set(key, fn);
  }
  return fn(variables);
}
export function tickStep(span: number): number {
  const p = 10 ** Math.floor(Math.log10(span / 9));
  const n = span / 9 / p;
  return (n > 5 ? 10 : n > 2 ? 5 : n > 1 ? 2 : 1) * p;
}
export function ticks(min: number, max: number): number[] {
  const step = tickStep(max - min),
    first = Math.ceil(min / step) * step;
  return [
    ...new Set(
      Array.from(
        {
          length: Math.min(
            30,
            Math.max(0, Math.floor((max - first) / step) + 1),
          ),
        },
        (_, i) => {
          const value = first + i * step;
          return Math.abs(value) / step > 1e12 ? value : +value.toPrecision(12);
        },
      ).filter((n) => Number.isFinite(n) && n >= min && n <= max),
    ),
  ];
}

export const newId = () => crypto.randomUUID();
export function validParameter(p: unknown): p is Parameter {
  if (!p || typeof p !== "object") return false;
  const v = p as Parameter;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    /^[a-df-wyz]$/.test(v.name) &&
    [v.min, v.max, v.value, v.step].every(Number.isFinite) &&
    Number.isFinite(v.max - v.min) &&
    v.min < v.max &&
    v.step > 0 &&
    v.value >= v.min &&
    v.value <= v.max
  );
}
export const parameterValues = (d: PlotDraft) =>
  Object.fromEntries(d.parameters.map((p) => [p.name, p.value]));
export function equalWindow(w: GraphWindow, aspect: number): GraphWindow {
  if (!Number.isFinite(aspect) || aspect <= 0) return w;
  const half = ((w.ymax - w.ymin) * aspect) / 2,
    cx = w.xmin + (w.xmax - w.xmin) / 2;
  const next = { ...w, xmin: cx - half, xmax: cx + half };
  return validWindow(next) ? next : w;
}
