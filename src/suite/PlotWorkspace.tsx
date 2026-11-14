import TraceControls, { type Selection } from "./TraceControls";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import { compileExpression } from "../math";
import {
  gestureWindow,
  sampleCompiled,
  STANDARD,
  validWindow,
  type Point,
  type GraphWindow,
} from "../plot";
import { SuiteEnvironment } from "./environment";
import { shellStyle } from "../KeyStylePicker";
import { useUndo } from "../useUndo";
import { usePersist } from "../usePersist";
import { useModalFocus } from "../useModalFocus";
import {
  INITIAL_PLOT,
  restorePlot,
  readPoint,
  parameterValues,
  newId,
  equalWindow,
  tickStep,
} from "./plotModel";
import PlotEditor from "./PlotEditor";
import PlotChart from "./PlotChart";
import { exportImage } from "./graphIO";
import type { Shade } from "./GraphAnalysis";
export default function PlotWorkspace() {
  const environment = useContext(SuiteEnvironment),
    style = environment?.keyStyle ?? "graphite";
  const history = useUndo(() => {
      try {
        return restorePlot(localStorage.getItem("graphite:plot"));
      } catch {
        return INITIAL_PLOT;
      }
    }),
    draft = history.state,
    setDraft = history.set;
  const [placing, setPlacing] = useState(false),
    [expanded, setExpanded] = useState(false),
    [selection, setSelection] = useState<Selection | null>(null),
    [notice, setNotice] = useState(""),
    [shade, setShade] = useState<Shade | null>(null),
    [size, setSize] = useState({ width: 800, height: 560 });
  const root = useRef<HTMLElement>(null),
    svg = useRef<SVGSVGElement>(null),
    close = useCallback(() => setExpanded(false), []);
  useModalFocus(expanded, root, close);
  usePersist("graphite:plot", draft);
  const w = draft.window,
    angle = draft.degrees ? "DEG" : "RAD",
    variables = useMemo(() => parameterValues(draft), [draft.parameters]);
  const parameterNames = Object.keys(variables).sort().join(",");
  const programs = useMemo(
    () =>
      draft.curves.map((c) => {
        if (!c.expression.trim()) return { id: c.id, error: "", fn: undefined };
        try {
          return {
            id: c.id,
            error: "",
            fn: compileExpression(
              c.expression,
              angle,
              0,
              Object.fromEntries(
                parameterNames
                  .split(",")
                  .filter(Boolean)
                  .map((n) => [n, 0]),
              ),
            ),
          };
        } catch (e) {
          return {
            id: c.id,
            error: e instanceof Error ? e.message : "Invalid expression",
            fn: undefined,
          };
        }
      }),
    [draft.curves, angle, parameterNames],
  );
  const compiled = useMemo(
    () =>
      programs.map((c) => ({
        ...c,
        fn: c.fn ? (x: number) => c.fn!(x, variables) : undefined,
      })),
    [programs, variables],
  );
  const curves = useMemo(
    () =>
      compiled.map((c, i) => ({
        ...c,
        segments:
          c.fn && draft.curves[i].enabled
            ? sampleCompiled(
                c.fn,
                w,
                Math.min(1500, Math.max(600, Math.round(size.width))),
              )
            : [],
      })),
    [compiled, w, size.width, draft.curves],
  );
  const coordinates = useMemo(
    () => draft.points.map((p) => readPoint(p, angle, variables)),
    [draft.points, angle, variables],
  );
  useEffect(() => {
    if (draft.equalUnits) {
      const next = equalWindow(w, size.width / size.height);
      if (
        Math.abs(next.xmin - w.xmin) >
        Math.max(1e-10, (w.xmax - w.xmin) * 1e-10)
      )
        history.replace((current) => ({
          ...current,
          window: equalWindow(current.window, size.width / size.height),
        }));
    }
  }, [w, draft.equalUnits, size.width, size.height]);
  const updateWindow = (window: GraphWindow, group?: string) => {
    if (validWindow(window))
      setDraft(
        (d) => ({
          ...d,
          window: d.equalUnits
            ? equalWindow(window, size.width / size.height)
            : window,
        }),
        group,
      );
  };
  const trace = useMemo<Point | null>(() => {
    if (!selection) return null;
    if (selection.kind === "free") return selection.point;
    if (selection.kind === "point") {
      const index = draft.points.findIndex((p) => p.id === selection.id);
      return coordinates[index] ?? null;
    }
    const i = draft.curves.findIndex((c) => c.id === selection.id);
    if (i < 0 || !draft.curves[i].enabled) return null;
    try {
      const y = compiled[i].fn?.(selection.x);
      return y === undefined ? null : [selection.x, y];
    } catch {
      return null;
    }
  }, [selection, coordinates, compiled, draft.points, draft.curves]);
  const tap = (p: Point) => {
    setNotice("");
    if (placing) {
      if (draft.points.length >= 200) {
        setNotice(
          "Limit of 200 points reached. Remove a point before adding another.",
        );
        return;
      }
      const id = newId();
      setDraft((d) => ({
        ...d,
        points: [
          ...d.points,
          {
            id,
            x: String(+p[0].toPrecision(10)),
            y: String(+p[1].toPrecision(10)),
          },
        ],
      }));
      setSelection({ kind: "point", id });
      environment?.keys.feedback("__ui__");
      return;
    }
    let best: Selection = { kind: "free", point: p },
      distance = 24;
    compiled.forEach((c, i) => {
      if (!draft.curves[i].enabled || !c.fn) return;
      try {
        const delta =
          (Math.abs(c.fn(p[0]) - p[1]) / (w.ymax - w.ymin)) * size.height;
        if (delta < distance) {
          distance = delta;
          best = { kind: "curve", id: c.id, x: p[0] };
        }
      } catch {
        /* Undefined domain. */
      }
    });
    coordinates.forEach((q, i) => {
      if (!q) return;
      const delta = Math.hypot(
        ((q[0] - p[0]) / (w.xmax - w.xmin)) * size.width,
        ((q[1] - p[1]) / (w.ymax - w.ymin)) * size.height,
      );
      if (delta < distance) {
        distance = delta;
        best = { kind: "point", id: draft.points[i].id };
      }
    });
    setSelection(best);
  };
  const moveTrace = (direction: number) => {
    if (selection?.kind === "curve")
      setSelection({
        ...selection,
        x: selection.x + (direction * (w.xmax - w.xmin)) / 100,
      });
    else if (draft.curves[0])
      setSelection({ kind: "curve", id: draft.curves[0].id, x: 0 });
  };
  const fit = () => {
    const p = coordinates.filter((q): q is Point => q !== null),
      xs = p.map((q) => q[0]),
      xmin = xs.length ? Math.min(...xs) - 2 : w.xmin,
      xmax = xs.length ? Math.max(...xs) + 2 : w.xmax,
      ys = p.map((q) => q[1]);
    compiled.forEach((c, i) => {
      if (!c.fn || !draft.curves[i].enabled) return;
      const values: number[] = [];
      for (let k = 0; k <= 100; k++)
        try {
          const n = c.fn(xmin + ((xmax - xmin) * k) / 100);
          if (Math.abs(n) < 1e100) values.push(n);
        } catch {
          /* Skip undefined samples. */
        }
      values.sort((a, b) => a - b);
      const trim = Math.floor(values.length * 0.025);
      ys.push(...values.slice(trim, values.length - trim));
    });
    if (!ys.length) {
      setNotice("No defined values to fit. Check the functions or points.");
      return;
    }
    const min = Math.min(...ys),
      max = Math.max(...ys),
      pad = Math.max(1, (max - min) * 0.12),
      next = { ...w, xmin, xmax, ymin: min - pad, ymax: max + pad };
    if (!validWindow(next)) {
      setNotice("Values are too large to fit. Choose a window manually.");
      return;
    }
    if (draft.equalUnits) {
      const desiredY = Math.max(
          next.ymax - next.ymin,
          ((next.xmax - next.xmin) * size.height) / size.width,
        ),
        cy = next.ymin + (next.ymax - next.ymin) / 2;
      next.ymin = cy - desiredY / 2;
      next.ymax = cy + desiredY / 2;
    }
    updateWindow(next);
    setNotice("");
  };
  return (
    <main
      ref={root}
      className={`plot-page ${expanded ? "plot-expanded" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? "Graph workspace" : undefined}
    >
      <div className="plot-heading">
        <div>
          <nav aria-label="Graphing views">
            <a href="#/">Instruments</a>
            <a href="#/graphing">84 calculator</a>
            <a href="#/surface">3D surfaces</a>
          </nav>
          <h1>Graph workspace</h1>
        </div>
        <button
          aria-pressed={expanded}
          onClick={(event) => {
            event.currentTarget.focus();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "Exit full screen" : "Full screen"}
        </button>
      </div>
      <div
        className="calculator instrument-material plot-instrument"
        data-key-style={style}
        data-shell={shellStyle(style)}
      >
        <PlotEditor
          draft={draft}
          setDraft={setDraft}
          placing={placing}
          setPlacing={setPlacing}
          errors={compiled.map((c) => c.error)}
          onWindowChange={(window) =>
            setDraft((d) => ({ ...d, window, equalUnits: false }))
          }
          onShade={setShade}
        />
        <section className="plot-stage" aria-label="Interactive graph">
          <div className="plot-controls">
            <button
              aria-label="Zoom in"
              onClick={() =>
                updateWindow(gestureWindow(w, [0.5, 0.5], [0.5, 0.5], 0.7))
              }
            >
              +
            </button>
            <button
              aria-label="Zoom out"
              onClick={() =>
                updateWindow(gestureWindow(w, [0.5, 0.5], [0.5, 0.5], 1 / 0.7))
              }
            >
              −
            </button>
            <button
              onClick={() => {
                updateWindow(STANDARD);
                setSelection(null);
                setNotice("");
              }}
            >
              Reset
            </button>
            <button onClick={fit}>Fit</button>
            <button disabled={!history.canUndo} onClick={history.undo}>
              Undo
            </button>
            <button disabled={!history.canRedo} onClick={history.redo}>
              Redo
            </button>
            <details className="graph-export">
              <summary>Export image</summary>
              <button
                onClick={() => {
                  if (svg.current)
                    void exportImage(svg.current, false).catch((e) =>
                      setNotice(String(e)),
                    );
                }}
              >
                SVG
              </button>
              <button
                onClick={() => {
                  if (svg.current)
                    void exportImage(svg.current, true).catch((e) =>
                      setNotice(String(e)),
                    );
                }}
              >
                PNG
              </button>
            </details>
          </div>
          <TraceControls
            draft={draft}
            selection={selection}
            setSelection={setSelection}
            trace={trace}
            moveTrace={moveTrace}
            onNotice={setNotice}
          />

          {placing && (
            <p className="graph-message">Click graph to add points</p>
          )}
          {notice && (
            <p className="graph-message" role="status">
              {notice}
            </p>
          )}
          {curves.some(
            (c, i) =>
              draft.curves[i].enabled && c.fn && c.segments.length === 0,
          ) && (
            <p className="graph-message" role="status">
              Some functions have no visible values. Check their domain or use
              Fit.
            </p>
          )}
          <PlotChart
            draft={draft}
            curves={curves}
            coordinates={coordinates}
            trace={trace}
            placing={placing}
            shade={shade}
            onSize={setSize}
            size={size}
            onWindow={updateWindow}
            onTap={tap}
            onDrag={(id, p, group) => {
              if (draft.snap) {
                const sx = tickStep(w.xmax - w.xmin),
                  sy = tickStep(w.ymax - w.ymin);
                p = [Math.round(p[0] / sx) * sx, Math.round(p[1] / sy) * sy];
              }
              setDraft(
                (d) => ({
                  ...d,
                  points: d.points.map((v) =>
                    v.id === id
                      ? {
                          ...v,
                          x: String(+p[0].toPrecision(10)),
                          y: String(+p[1].toPrecision(10)),
                        }
                      : v,
                  ),
                }),
                group,
              );
            }}
            onSelectPoint={(id) => setSelection({ kind: "point", id })}
            onTraceStep={moveTrace}
            svgRef={svg}
          />
        </section>
      </div>
    </main>
  );
}
