import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { compileExpression, numberText } from "../math";
import type { Point } from "../plot";
import { parameterValues, type PlotDraft } from "./plotModel";
export type Selection =
  | { kind: "curve"; id: string; x: number }
  | { kind: "point"; id: string }
  | { kind: "free"; point: Point };

export default function TraceControls({
  draft,
  selection,
  setSelection,
  trace,
  moveTrace,
  onNotice,
}: {
  draft: PlotDraft;
  selection: Selection | null;
  setSelection: Dispatch<SetStateAction<Selection | null>>;
  trace: Point | null;
  moveTrace: (direction: number) => void;
  onNotice: (message: string) => void;
}) {
  const [traceInput, setTraceInput] = useState("0"),
    angle = draft.degrees ? "DEG" : "RAD",
    variables = useMemo(() => parameterValues(draft), [draft.parameters]);
  const x = selection?.kind === "curve" ? selection.x : undefined;
  useEffect(() => {
    if (x !== undefined) setTraceInput(numberText(x));
  }, [x]);
  return (
    <div className="trace-controls">
      <label>
        Inspect
        <select
          aria-label="Inspect graph item"
          value={
            selection?.kind === "curve"
              ? `c:${selection.id}`
              : selection?.kind === "point"
                ? `p:${selection.id}`
                : ""
          }
          onChange={(e) => {
            const [kind, id] = e.target.value.split(":");
            setSelection(
              kind === "c"
                ? { kind: "curve", id, x: Number(traceInput) || 0 }
                : kind === "p"
                  ? { kind: "point", id }
                  : null,
            );
          }}
        >
          <option value="">Select…</option>
          {draft.curves.map((c, i) => (
            <option key={c.id} value={`c:${c.id}`}>
              Y{i + 1}
            </option>
          ))}
          {draft.points.map((p, i) => (
            <option key={p.id} value={`p:${p.id}`}>
              Point {i + 1}
            </option>
          ))}
        </select>
      </label>
      {selection?.kind === "curve" && (
        <>
          <label>
            x
            <input
              aria-label="Trace x coordinate"
              value={traceInput}
              onChange={(e) => setTraceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  try {
                    const x = compileExpression(
                      traceInput,
                      angle,
                      0,
                      variables,
                    )();
                    setSelection({ ...selection, x });
                    onNotice("");
                  } catch {
                    onNotice("Enter a finite trace coordinate");
                  }
                }
              }}
            />
          </label>
          <button
            onClick={() => {
              try {
                setSelection({
                  ...selection,
                  x: compileExpression(traceInput, angle, 0, variables)(),
                });
                onNotice("");
              } catch {
                onNotice("Enter a finite trace coordinate");
              }
            }}
          >
            Inspect x
          </button>
          <button
            aria-label="Previous trace value"
            onClick={() => moveTrace(-1)}
          >
            −x
          </button>
          <button aria-label="Next trace value" onClick={() => moveTrace(1)}>
            +x
          </button>
        </>
      )}
      <output aria-live="polite">
        {trace
          ? `(${numberText(trace[0])}, ${numberText(trace[1])})`
          : selection
            ? "Undefined or removed selection"
            : ""}
      </output>
    </div>
  );
}
