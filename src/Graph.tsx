import { useMemo, type Dispatch } from "react";
import { sampleGraph, COLORS } from "./plot";
import { compileExpression, numberText } from "./math";
import type { State, Action } from "./state";
import { useGraphGestures } from "./useGraphGestures";
export default function Graph({
  state: s,
  dispatch,
}: {
  state: State;
  dispatch: Dispatch<Action>;
}) {
  const gestures = useGraphGestures(s, dispatch);
  const w = s.window,
    W = 320,
    H = 192;
  const px = (x: number) => ((x - w.xmin) / (w.xmax - w.xmin)) * W;
  const py = (y: number) => H - ((y - w.ymin) / (w.ymax - w.ymin)) * H;
  const paths = useMemo(
    () =>
      s.functions.map((f) =>
        f.enabled && f.expression
          ? sampleGraph(f.expression, w, s.angle, s.ans, s.variables)
              .map((segment) =>
                segment
                  .map(
                    ([x, y], i) =>
                      `${i ? "L" : "M"}${(((x - w.xmin) / (w.xmax - w.xmin)) * W).toFixed(2)},${(H - ((y - w.ymin) / (w.ymax - w.ymin)) * H).toFixed(2)}`,
                  )
                  .join(" "),
              )
              .join(" ")
          : "",
      ),
    [s.functions, w, s.angle, s.ans, s.variables],
  );
  const ticks = (min: number, max: number, scale: number) => {
    const step = Math.max(scale, (max - min) / 30);
    return Array.from(
      {
        length: Math.min(
          32,
          Math.floor((max - Math.ceil(min / step) * step) / step) + 1,
        ),
      },
      (_, i) => Math.ceil(min / step) * step + i * step,
    );
  };
  let traceY: number | undefined;
  if (s.trace)
    try {
      const f = s.functions[s.traceFunction];
      if (f.enabled && f.expression)
        traceY = compileExpression(
          f.expression,
          s.angle,
          s.ans,
          s.variables,
        )(s.traceX);
    } catch {
      /* Undefined trace positions are shown in the readout. */
    }
  const visibleTrace =
    traceY !== undefined &&
    s.traceX >= w.xmin &&
    s.traceX <= w.xmax &&
    traceY >= w.ymin &&
    traceY <= w.ymax;
  const traceLabel =
    traceY === undefined
      ? ""
      : `(${numberText(Number(s.traceX.toPrecision(5)))}, ${numberText(Number(traceY.toPrecision(5)))})`;
  const labelWidth = Math.min(W - 8, traceLabel.length * 5 + 12);
  const labelX = Math.max(
    4,
    Math.min(
      W - labelWidth - 4,
      px(s.traceX) + labelWidth + 12 < W
        ? px(s.traceX) + 10
        : px(s.traceX) - labelWidth - 10,
    ),
  );
  const labelY =
    traceY === undefined
      ? 0
      : Math.max(
          4,
          Math.min(H - 24, py(traceY) > 32 ? py(traceY) - 28 : py(traceY) + 10),
        );
  return (
    <div className="graph-view">
      <svg
        {...gestures}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Function graph"
        preserveAspectRatio="none"
        aria-description="Drag to pan. Scroll or pinch to zoom. Click a curve to trace."
      >
        <defs>
          <clipPath id="plotClip">
            <rect width={W} height={H} />
          </clipPath>
        </defs>
        {ticks(w.xmin, w.xmax, w.xscl).map((x) => (
          <g key={`x${x}`}>
            <path d={`M${px(x)},0V${H}`} className="grid-line" />
            {x !== 0 && (
              <text
                x={Math.max(9, Math.min(W - 12, px(x) + 2))}
                y={Math.max(11, Math.min(H - 3, py(0) + 11))}
              >
                {numberText(x)}
              </text>
            )}
          </g>
        ))}
        {ticks(w.ymin, w.ymax, w.yscl).map((y) => (
          <g key={`y${y}`}>
            <path d={`M0,${py(y)}H${W}`} className="grid-line" />
            {y !== 0 && (
              <text
                x={Math.max(2, Math.min(W - 22, px(0) + 3))}
                y={Math.max(9, Math.min(H - 2, py(y) - 3))}
              >
                {numberText(y)}
              </text>
            )}
          </g>
        ))}
        <g clipPath="url(#plotClip)">
          <path d={`M${px(0)},0V${H}M0,${py(0)}H${W}`} className="axis-line" />
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={COLORS[i]}
              strokeWidth="1.7"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {s.trace && traceY !== undefined && (
            <g stroke={COLORS[s.traceFunction]}>
              <path
                d={`M${px(s.traceX) - 5},${py(traceY)}h10M${px(s.traceX)},${py(traceY) - 5}v10`}
              />
              <circle cx={px(s.traceX)} cy={py(traceY)} r="3" fill="white" />
            </g>
          )}
        </g>
        {s.trace && visibleTrace && (
          <g
            className="trace-label"
            transform={`translate(${labelX},${labelY})`}
            pointerEvents="none"
          >
            <rect
              width={labelWidth}
              height="20"
              rx="3"
              fill="#edf1e5"
              stroke={COLORS[s.traceFunction]}
              strokeWidth=".7"
            />
            <text x="6" y="13">
              {traceLabel}
            </text>
          </g>
        )}
      </svg>
      <div className="graph-readout">
        {s.trace
          ? `Y${s.traceFunction + 1}  X=${numberText(s.traceX)}  Y=${traceY === undefined ? "undefined" : numberText(traceY)}`
          : `X [${numberText(w.xmin)}, ${numberText(w.xmax)}]  Y [${numberText(w.ymin)}, ${numberText(w.ymax)}]`}
      </div>
    </div>
  );
}
