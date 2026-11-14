import { SuiteEnvironment } from "./environment";
import { shellStyle } from "../KeyStylePicker";
import {
  useContext,
  useMemo,
  useState,
  useRef,
  type PointerEvent,
} from "react";
import { compileExpression } from "../math";
import { useDraft } from "./useDraft";
import { sampleSurface } from "./surface";
export default function SurfacePlot() {
  const environment = useContext(SuiteEnvironment);
  const style = environment?.keyStyle ?? "graphite";
  const [fields, setFields] = useDraft("surface", {
      expression: "sin(sqrt(x^2+y^2))",
      range: "5",
      zmin: "-10",
      zmax: "10",
    }),
    [expression, setExpression] = useState(fields.expression),
    [range, setRange] = useState(() => {
      const r = Number(fields.range);
      return Number.isFinite(r) && r >= 0.01 && r <= 100 ? r : 5;
    }),
    [zrange, setZrange] = useState(() => {
      const lo = Number(fields.zmin),
        hi = Number(fields.zmax);
      return Number.isFinite(lo) && Number.isFinite(hi) && lo < hi
        ? [lo, hi]
        : [-10, 10];
    }),
    [zoom, setZoom] = useState(1),
    [error, setError] = useState(""),
    [rotation, setRotation] = useState({ yaw: 0.7, pitch: 0.55 });
  const drag = useRef<{
    x: number;
    y: number;
    yaw: number;
    pitch: number;
  } | null>(null);
  const project = (x: number, y: number, z: number) => {
    const a = x * Math.cos(rotation.yaw) - y * Math.sin(rotation.yaw),
      b = x * Math.sin(rotation.yaw) + y * Math.cos(rotation.yaw);
    return [
      300 + ((a * 27) / range) * 5 * zoom,
      210 +
        (((b * Math.sin(rotation.pitch) * 27) / range) * 5 -
          (z - (zrange[0] + zrange[1]) / 2) *
            Math.cos(rotation.pitch) *
            (200 / (zrange[1] - zrange[0]))) *
          zoom,
    ];
  };
  const samples = useMemo(() => {
    try {
      return sampleSurface(expression, range, zrange[0], zrange[1]);
    } catch {
      return [];
    }
  }, [expression, range, zrange]);
  const paths = samples.map((line) => ({
    axis: line.axis,
    d: line.points
      .map(([x, y, z], i) => {
        const [px, py] = project(x, y, z);
        return `${i ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`;
      })
      .join(" "),
  }));
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    setRotation({
      yaw: drag.current.yaw + (e.clientX - drag.current.x) * 0.008,
      pitch: Math.max(
        0.15,
        Math.min(
          1.4,
          drag.current.pitch + (e.clientY - drag.current.y) * 0.005,
        ),
      ),
    });
  };
  return (
    <main className="suite-tool">
      <nav className="tool-breadcrumb">
        <a href="#/">← Instruments</a>
        <a href="#/graphing">84 calculator</a>
        <a href="#/plot">Graph workspace</a>
      </nav>
      <h1>3D Graphing</h1>
      <div
        className="calculator instrument-material surface-workspace"
        data-key-style={style}
        data-shell={shellStyle(style)}
      >
        <form
          className="surface-controls"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const r = Number(fields.range);
              if (!Number.isFinite(r) || r < 0.01 || r > 100)
                throw Error("Use a range from 0.01 to 100");
              compileExpression(fields.expression, "RAD", 0, { y: 0 });
              const lo = Number(fields.zmin),
                hi = Number(fields.zmax);
              if (
                !fields.zmin.trim() ||
                !fields.zmax.trim() ||
                !Number.isFinite(lo) ||
                !Number.isFinite(hi) ||
                lo >= hi ||
                hi - lo < 1e-10 ||
                !Number.isFinite(hi - lo)
              )
                throw Error("Use finite, ordered z bounds");
              setZrange([lo, hi]);
              setRange(r);
              setExpression(fields.expression);
              setError("");
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Invalid surface",
              );
            }
          }}
        >
          <label>
            z = f(x, y)
            <input
              value={fields.expression}
              onChange={(e) =>
                setFields((old) => ({ ...old, expression: e.target.value }))
              }
              maxLength={240}
            />
          </label>
          <label>
            x, y range ±
            <input
              value={fields.range}
              onChange={(e) =>
                setFields((old) => ({ ...old, range: e.target.value }))
              }
            />
          </label>
          <label>
            z minimum
            <input
              aria-label="z minimum"
              value={fields.zmin}
              onChange={(e) =>
                setFields((f) => ({ ...f, zmin: e.target.value }))
              }
            />
          </label>
          <label>
            z maximum
            <input
              aria-label="z maximum"
              value={fields.zmax}
              onChange={(e) =>
                setFields((f) => ({ ...f, zmax: e.target.value }))
              }
            />
          </label>
          <button type="submit">Plot surface</button>
          <button
            type="button"
            onClick={() => {
              setRotation({ yaw: 0.7, pitch: 0.55 });
              setZoom(1);
            }}
          >
            Reset view
          </button>
        </form>
        <div className="surface-navigation">
          <button
            aria-label="Zoom surface in"
            onClick={() => setZoom((v) => Math.min(4, v * 1.2))}
          >
            Zoom in
          </button>
          <button
            aria-label="Zoom surface out"
            onClick={() => setZoom((v) => Math.max(0.25, v / 1.2))}
          >
            Zoom out
          </button>
        </div>
        {error && (
          <p role="alert" className="tool-error">
            {error}
          </p>
        )}
        <svg
          className="surface-plot"
          viewBox="0 0 600 420"
          role="img"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key.startsWith("Arrow")) {
              e.preventDefault();
              setRotation((v) => ({
                yaw:
                  v.yaw +
                  (e.key === "ArrowLeft"
                    ? -0.1
                    : e.key === "ArrowRight"
                      ? 0.1
                      : 0),
                pitch: Math.max(
                  0.15,
                  Math.min(
                    1.4,
                    v.pitch +
                      (e.key === "ArrowUp"
                        ? 0.08
                        : e.key === "ArrowDown"
                          ? -0.08
                          : 0),
                  ),
                ),
              }));
            } else if (e.key === "+" || e.key === "-") {
              e.preventDefault();
              setZoom((v) =>
                Math.max(
                  0.25,
                  Math.min(4, v * (e.key === "+" ? 1.2 : 1 / 1.2)),
                ),
              );
            }
          }}
          aria-label="3D function surface; drag to rotate"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ...rotation };
          }}
          onPointerMove={move}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <defs>
            <clipPath id="surfaceClip">
              <rect width="600" height="420" />
            </clipPath>
          </defs>
          <g clipPath="url(#surfaceClip)">
            {paths.map((line, i) => (
              <path
                key={i}
                d={line.d}
                fill="none"
                className={
                  line.axis === 0 ? "surface-wire-a" : "surface-wire-b"
                }
                strokeWidth=".8"
                opacity=".8"
              />
            ))}
            {[
              [range, 0, 0, "x"],
              [0, range, 0, "y"],
              [0, 0, zrange[1], "z"],
            ].map(([x, y, z, label]) => {
              const [px, py] = project(Number(x), Number(y), Number(z)),
                [ox, oy] = project(0, 0, 0);
              return (
                <g key={label}>
                  <path
                    d={`M${ox},${oy}L${px},${py}`}
                    stroke="currentColor"
                    opacity=".5"
                  />
                  <text x={px + 6} y={py + 5} fill="currentColor" fontSize="12">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        <p className="result-note">
          Drag or use arrow keys to rotate. Values outside z = {zrange[0]}…
          {zrange[1]} are clipped.{" "}
          {samples.length === 0
            ? "No defined surface is visible in these bounds."
            : ""}
        </p>
      </div>
    </main>
  );
}
