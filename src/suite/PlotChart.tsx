import { useEffect, useId, useMemo, useRef } from "react";
import { numberText } from "../math";
import { sampleCompiled, type GraphWindow, type Point } from "../plot";
import { ticks, type PlotDraft } from "./plotModel";
import { usePlotGestures } from "./usePlotGestures";
import type { Shade } from "./GraphAnalysis";
export interface CompiledCurve {
  id: string;
  fn?: (x: number) => number;
  error: string;
  segments: Point[][];
}
interface Props {
  draft: PlotDraft;
  curves: CompiledCurve[];
  coordinates: (Point | null)[];
  trace: Point | null;
  placing: boolean;
  shade: Shade | null;
  onSize: (size: { width: number; height: number }) => void;
  size: { width: number; height: number };
  onWindow: (w: GraphWindow, group?: string) => void;
  onTap: (p: Point) => void;
  onDrag: (id: string, p: Point, group: string) => void;
  onSelectPoint: (id: string) => void;
  onTraceStep: (direction: number) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}
export default function PlotChart({
  draft,
  curves,
  coordinates,
  trace,
  placing,
  shade,
  onSize,
  size,
  onWindow,
  onTap,
  onDrag,
  onSelectPoint,
  onTraceStep,
  svgRef: svg,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null),
    clip = useId(),
    w = draft.window,
    drag = useRef<{ id: string; group: string } | null>(null),
    panGroup = useRef("");
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0)
        onSize({ width: r.width, height: r.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onSize]);
  const gestures = usePlotGestures(
    svg,
    w,
    (next) => onWindow(next, panGroup.current || "wheel"),
    onTap,
  );
  const x = (n: number) => ((n - w.xmin) / (w.xmax - w.xmin)) * size.width,
    y = (n: number) => (1 - (n - w.ymin) / (w.ymax - w.ymin)) * size.height,
    pointLabel = (p: Point) => `(${numberText(p[0])}, ${numberText(p[1])})`;
  const shadePath = useMemo(() => {
    if (!shade) return "";
    const curve = curves.find((c) => c.id === shade.curve);
    if (!curve?.fn) return "";
    const pieces = sampleCompiled(
      curve.fn,
      { ...w, xmin: shade.lower, xmax: shade.upper },
      300,
    );
    return pieces
      .map(
        (s) =>
          `M${x(s[0][0])},${y(0)} ` +
          s.map((p) => `L${x(p[0])},${y(p[1])}`).join(" ") +
          ` L${x(s.at(-1)![0])},${y(0)} Z`,
      )
      .join(" ");
  }, [shade, curves, w, size]);
  return (
    <div className={`plot-viewport ${placing ? "placing" : ""}`} ref={viewport}>
      <svg
        ref={svg}
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label="Function graph with editable coordinate points"
        aria-describedby={`${clip}-help`}
        tabIndex={0}
        onPointerDown={(e) => {
          panGroup.current = `pan:${crypto.randomUUID()}`;
          gestures.onPointerDown(e);
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            const r = e.currentTarget.getBoundingClientRect(),
              p: Point = [
                w.xmin + ((e.clientX - r.left) / r.width) * (w.xmax - w.xmin),
                w.ymax - ((e.clientY - r.top) / r.height) * (w.ymax - w.ymin),
              ];
            onDrag(drag.current.id, p, drag.current.group);
          } else gestures.onPointerMove(e);
        }}
        onPointerUp={(e) => {
          if (drag.current) drag.current = null;
          else gestures.onPointerUp(e);
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          gestures.onPointerCancel(e);
        }}
        onLostPointerCapture={(e) => {
          drag.current = null;
          gestures.onLostPointerCapture(e);
        }}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight"].includes(e.key) && e.shiftKey) {
            e.preventDefault();
            onTraceStep(e.key === "ArrowLeft" ? -1 : 1);
            return;
          }
          if (
            [
              "+",
              "=",
              "-",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
            ].includes(e.key)
          ) {
            e.preventDefault();
            const span = w.xmax - w.xmin,
              ys = w.ymax - w.ymin;
            if (["+", "=", "-"].includes(e.key)) {
              const f = e.key === "-" ? 1 / 0.7 : 0.7,
                cx = w.xmin + span / 2,
                cy = w.ymin + ys / 2;
              onWindow({
                ...w,
                xmin: cx - (span * f) / 2,
                xmax: cx + (span * f) / 2,
                ymin: cy - (ys * f) / 2,
                ymax: cy + (ys * f) / 2,
              });
            } else {
              const dx =
                  (e.key === "ArrowLeft"
                    ? -0.1
                    : e.key === "ArrowRight"
                      ? 0.1
                      : 0) * span,
                dy =
                  (e.key === "ArrowDown"
                    ? -0.1
                    : e.key === "ArrowUp"
                      ? 0.1
                      : 0) * ys;
              onWindow({
                ...w,
                xmin: w.xmin + dx,
                xmax: w.xmax + dx,
                ymin: w.ymin + dy,
                ymax: w.ymax + dy,
              });
            }
          }
        }}
      >
        <defs>
          <clipPath id={clip}>
            <rect width={size.width} height={size.height} />
          </clipPath>
        </defs>
        <g className="plot-grid">
          {ticks(w.xmin, w.xmax).map((t) => (
            <line key={`x${t}`} x1={x(t)} x2={x(t)} y1={0} y2={size.height} />
          ))}
          {ticks(w.ymin, w.ymax).map((t) => (
            <line key={`y${t}`} x1={0} x2={size.width} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="plot-axes">
          {w.xmin <= 0 && w.xmax >= 0 && (
            <line x1={x(0)} x2={x(0)} y1={0} y2={size.height} />
          )}
          {w.ymin <= 0 && w.ymax >= 0 && (
            <line x1={0} x2={size.width} y1={y(0)} y2={y(0)} />
          )}
        </g>
        <g className="plot-ticks">
          {ticks(w.xmin, w.xmax).map((t) => (
            <text
              key={`x${t}`}
              x={x(t) + 5}
              y={Math.max(16, Math.min(size.height - 8, y(0) + 17))}
            >
              {numberText(t)}
            </text>
          ))}
          {ticks(w.ymin, w.ymax)
            .filter((t) => t !== 0)
            .map((t) => (
              <text
                key={`y${t}`}
                x={Math.max(6, Math.min(size.width - 48, x(0) + 7))}
                y={y(t) - 5}
              >
                {numberText(t)}
              </text>
            ))}
        </g>
        <g clipPath={`url(#${clip})`}>
          {shadePath && <path className="integral-shade" d={shadePath} />}
          {curves.map((c, i) => (
            <g key={c.id} className="plot-curve" data-curve={i % 6}>
              {c.segments.map((segment, j) => (
                <path
                  key={j}
                  d={segment
                    .map(
                      ([a, b], k) =>
                        `${k ? "L" : "M"}${x(a).toFixed(2)},${y(b).toFixed(2)}`,
                    )
                    .join(" ")}
                />
              ))}
            </g>
          ))}
          {coordinates.map(
            (p, i) =>
              p &&
              p[0] >= w.xmin &&
              p[0] <= w.xmax &&
              p[1] >= w.ymin &&
              p[1] <= w.ymax && (
                <g className="plot-point" key={i}>
                  <circle data-point={i} cx={x(p[0])} cy={y(p[1])} r={5} />
                  <circle
                    className="point-hit"
                    cx={x(p[0])}
                    cy={y(p[1])}
                    r={22}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      drag.current = {
                        id: draft.points[i].id,
                        group: `drag:${crypto.randomUUID()}`,
                      };
                      onSelectPoint(draft.points[i].id);
                    }}
                  />
                  {draft.labels && (
                    <text x={x(p[0]) + 10} y={y(p[1]) - 10}>
                      {pointLabel(p)}
                    </text>
                  )}
                </g>
              ),
          )}
          {trace &&
            trace[0] >= w.xmin &&
            trace[0] <= w.xmax &&
            trace[1] >= w.ymin &&
            trace[1] <= w.ymax && (
              <g className="plot-trace">
                <circle cx={x(trace[0])} cy={y(trace[1])} r={7} />
              </g>
            )}
        </g>
      </svg>
      <span id={`${clip}-help`} className="sr-only">
        Arrow keys pan. Plus and minus zoom. Shift with left or right moves the
        selected trace. Coordinate tables provide keyboard editing.
      </span>
    </div>
  );
}
