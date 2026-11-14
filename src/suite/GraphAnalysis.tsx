import { useEffect, useRef, useState } from "react";
import { numberText } from "../math";
import { evaluate } from "../math";
import { parameterValues, type PlotDraft } from "./plotModel";
import type {
  AnalysisOperation,
  AnalysisRequest,
  AnalysisResult,
} from "./analysis";
export interface Shade {
  curve: string;
  lower: number;
  upper: number;
}
export default function GraphAnalysis({
  draft,
  onShade,
}: {
  draft: PlotDraft;
  onShade: (shade: Shade | null) => void;
}) {
  const [operation, setOperation] = useState<AnalysisOperation>("roots"),
    [first, setFirst] = useState(draft.curves[0]?.id ?? ""),
    [second, setSecond] = useState(draft.curves[1]?.id ?? ""),
    [lower, setLower] = useState(String(draft.window.xmin)),
    [upper, setUpper] = useState(String(draft.window.xmax)),
    [output, setOutput] = useState<AnalysisResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const job = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = () => {
    clearTimeout(timer.current);
    job.current?.terminate();
    job.current = null;
  };
  const signature = JSON.stringify([
    draft.curves,
    draft.parameters,
    draft.degrees,
  ]);
  useEffect(() => {
    stop();
    setBusy(false);
    setOutput(null);
    onShade(null);
  }, [signature]);
  useEffect(() => {
    stop();
    setBusy(false);
    setOutput(null);
    setError("");
    onShade(null);
  }, [operation, first, second, lower, upper]);
  useEffect(() => {
    if (!draft.curves.some((c) => c.id === first))
      setFirst(draft.curves[0]?.id ?? "");
    if (!draft.curves.some((c) => c.id === second))
      setSecond(draft.curves[1]?.id ?? draft.curves[0]?.id ?? "");
  }, [draft.curves]);
  useEffect(() => () => stop(), []);
  return (
    <details className="graph-analysis">
      <summary>Analyze</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          stop();
          setError("");
          setOutput(null);
          onShade(null);
          try {
            const curve = draft.curves.find((c) => c.id === first);
            if (!curve) throw Error("Select a function");
            const a = evaluate(lower, "RAD"),
              b = evaluate(upper, "RAD");
            if (a >= b)
              throw Error("Lower bound must be smaller than upper bound");
            const id = crypto.randomUUID();
            const instance = new Worker(
              new URL("./analysis.worker.ts", import.meta.url),
              { type: "module" },
            );
            job.current = instance;
            setBusy(true);
            instance.onmessage = (
              e: MessageEvent<{
                id: string;
                result?: AnalysisResult;
                error?: string;
              }>,
            ) => {
              if (job.current !== instance || e.data.id !== id) return;
              stop();
              setBusy(false);
              setError(e.data.error ?? "");
              setOutput(e.data.result ?? null);
              if (e.data.result && operation === "integral")
                onShade({ curve: first, lower: a, upper: b });
            };
            instance.onerror = () => {
              stop();
              setBusy(false);
              setError("Analysis failed. Try again.");
            };
            timer.current = setTimeout(() => {
              stop();
              setBusy(false);
              setError(
                "Analysis exceeded its time limit. Narrow the interval.",
              );
            }, 6000);
            instance.postMessage({
              id,
              operation,
              expression: curve.expression,
              other:
                draft.curves.find((c) => c.id === second)?.expression ?? "",
              parameters: parameterValues(draft),
              angle: draft.degrees ? "DEG" : "RAD",
              lower: a,
              upper: b,
            } satisfies AnalysisRequest);
          } catch (err) {
            setBusy(false);
            setError(err instanceof Error ? err.message : "Analysis failed");
          }
        }}
      >
        <label>
          Operation
          <select
            aria-label="Operation"
            value={operation}
            onChange={(e) => setOperation(e.target.value as AnalysisOperation)}
          >
            <option value="roots">Roots</option>
            <option value="intersection">Intersections</option>
            <option value="minimum">Local minima</option>
            <option value="maximum">Local maxima</option>
            <option value="integral">Definite integral</option>
          </select>
        </label>
        <label>
          Function
          <select
            aria-label="Function"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          >
            {draft.curves.map((c, i) => (
              <option value={c.id} key={c.id}>
                Y{i + 1}
              </option>
            ))}
          </select>
        </label>
        {operation === "intersection" && (
          <label>
            Other function
            <select
              aria-label="Other function"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
            >
              {draft.curves.map((c, i) => (
                <option value={c.id} key={c.id}>
                  Y{i + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Lower bound
          <input
            aria-label="Lower bound"
            value={lower}
            onChange={(e) => setLower(e.target.value)}
          />
        </label>
        <label>
          Upper bound
          <input
            aria-label="Upper bound"
            value={upper}
            onChange={(e) => setUpper(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setLower(String(draft.window.xmin));
            setUpper(String(draft.window.xmax));
          }}
        >
          Use visible interval
        </button>
        <button disabled={busy}>{busy ? "Analyzing…" : "Run analysis"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {output && (
        <div aria-live="polite">
          {output.value !== undefined && (
            <p>
              ≈ {numberText(output.value)}
              {output.error !== undefined &&
                ` (estimated error ${output.error.toExponential(2)})`}
            </p>
          )}
          {output.points.map((p, i) => (
            <p key={i}>
              ({numberText(p[0])}, {numberText(p[1])})
            </p>
          ))}
          <p>{output.message}</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  output.value !== undefined
                    ? numberText(output.value)
                    : output.points.map((p) => p.join(", ")).join("\n"),
                );
              } catch {
                setError("Copy unavailable. Select the result text.");
              }
            }}
          >
            Copy analysis
          </button>
        </div>
      )}
    </details>
  );
}
