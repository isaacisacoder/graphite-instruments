import MatrixInput from "./MatrixInput";
import { MathPreview } from "../MathInput";
import { useContext } from "react";
import { SuiteEnvironment } from "./environment";
import { shellStyle } from "../KeyStylePicker";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { OPERATIONS } from "./operations";
import { INSTRUMENTS, type Instrument } from "./catalog";
import { useDraft } from "./useDraft";
import type {
  CalculationRequest,
  CalculationResponse,
} from "./calculate.worker";
import type { ToolResult } from "./numeric";
function OperationForm({
  tool,
  operation,
}: {
  tool: string;
  operation: string;
}) {
  const config = OPERATIONS[tool].find((item) => item.id === operation)!;
  const [fields, setFields, history] = useDraft(
    `${tool}:${operation}`,
    Object.fromEntries(config.fields.map((f) => [f.id, f.initial])),
  );
  const signature = JSON.stringify(fields),
    cacheKey = `graphite:result:${tool}:${operation}`;
  const [output, setOutput] = useState<ToolResult | null>(() => {
      try {
        const record = JSON.parse(localStorage.getItem(cacheKey) ?? "null");
        return record?.signature === signature &&
          Array.isArray(record.result?.items)
          ? record.result
          : null;
      } catch {
        return null;
      }
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = () => {
    clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
  };
  useEffect(() => () => stop(), []);
  const update = (name: string, value: string) => {
    if (busy) {
      stop();
      setBusy(false);
    }
    setFields((old) => ({ ...old, [name]: value }), `field:${name}`);
    setError("");
    setOutput(null);
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      /* Optional cache. */
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    stop();
    setError("");
    setOutput(null);
    setBusy(true);
    let instance: Worker;
    try {
      instance = new Worker(new URL("./calculate.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      setBusy(false);
      setError("Unable to start the calculation. Try Calculate again.");
      return;
    }
    const id = crypto.randomUUID();
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<CalculationResponse>) => {
      if (
        worker.current !== instance ||
        (event.data.id && event.data.id !== id)
      )
        return;
      clearTimeout(timer.current);
      setBusy(false);
      setError(event.data.error ?? "");
      if (event.data.result)
        try {
          localStorage.setItem(
            `graphite:suite:${tool}:${operation}`,
            JSON.stringify(fields),
          );
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ signature, result: event.data.result }),
          );
        } catch {
          /* Calculations remain usable when storage is unavailable. */
        }
      setOutput(event.data.result ?? null);
      instance.terminate();
      worker.current = null;
    };
    instance.onerror = () => {
      if (worker.current !== instance) return;
      stop();
      setBusy(false);
      setError("Unable to complete this calculation");
    };
    instance.postMessage({
      id,
      tool,
      operation,
      fields,
    } satisfies CalculationRequest);
    timer.current = setTimeout(() => {
      stop();
      setBusy(false);
      setError("Calculation exceeded 6 seconds. Simplify the input.");
    }, 6000);
  };
  return (
    <div className="tool-workspace">
      <form onSubmit={submit} className="instrument-form">
        <div className="edit-history">
          <button
            type="button"
            disabled={!history.canUndo}
            onClick={() => {
              history.undo();
              setOutput(null);
            }}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!history.canRedo}
            onClick={() => {
              history.redo();
              setOutput(null);
            }}
          >
            Redo
          </button>
        </div>
        <h2>{config.name}</h2>
        {config.fields.map((field) => (
          <div
            key={field.id}
            className={`instrument-field ${field.multiline ? "wide-field" : ""}`}
          >
            <label htmlFor={`field-${tool}-${field.id}`}>{field.label}</label>
            {field.options ? (
              <select
                id={`field-${tool}-${field.id}`}
                aria-label={field.label}
                value={fields[field.id]}
                onChange={(e) => update(field.id, e.target.value)}
              >
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : tool === "matrix" && field.multiline ? (
              <MatrixInput
                label={field.label}
                value={fields[field.id]}
                onChange={(value) => update(field.id, value)}
              />
            ) : field.multiline ? (
              <textarea
                id={`field-${tool}-${field.id}`}
                aria-label={field.label}
                value={fields[field.id]}
                spellCheck={false}
                onChange={(e) => update(field.id, e.target.value)}
                rows={5}
                maxLength={5000}
              />
            ) : (
              <input
                id={`field-${tool}-${field.id}`}
                aria-label={field.label}
                value={fields[field.id]}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => update(field.id, e.target.value)}
                maxLength={tool === "cas" || tool === "calculus" ? 240 : 1000}
              />
            )}
            {field.id === "expression" && (
              <MathPreview value={fields[field.id]} />
            )}
          </div>
        ))}
        <button className="calculate-action" type="submit" disabled={busy}>
          {busy ? "Calculating…" : "Calculate"}
          <span aria-hidden="true">↵</span>
        </button>
      </form>
      <section
        className="tool-output"
        aria-label="Calculation result"
        aria-live="polite"
        aria-busy={busy}
      >
        <h2>Result</h2>
        {error ? (
          <p className="tool-error" role="alert">
            {error}
          </p>
        ) : output ? (
          <>
            <dl>
              {output.items.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd title={item.value}>
                    {tool === "financial" &&
                    [
                      "Monthly payment",
                      "Total paid",
                      "Total interest",
                      "Future value",
                      "Contributions",
                      "Growth",
                    ].includes(item.label)
                      ? Number(item.value).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : item.value}
                  </dd>
                </div>
              ))}
            </dl>
            {output.table && (
              <div
                className="result-table-scroll"
                tabIndex={0}
                aria-label="Result table"
              >
                <table>
                  <thead>
                    <tr>
                      {output.table.headers.map((h, i) => (
                        <th key={`${h}${i}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {output.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((value, j) => (
                          <td key={j}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {output.estimate && (
              <p className="result-note">
                Approximate; estimated absolute error{" "}
                {output.estimate.error.toExponential(2)}.
              </p>
            )}
            {output.warnings?.map((w) => (
              <p role="status" className="result-note" key={w}>
                {w}
              </p>
            ))}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    output.items
                      .map((i) => `${i.label}: ${i.value}`)
                      .join("\n") +
                      (output.table
                        ? "\n" +
                          output.table.rows.map((r) => r.join("\t")).join("\n")
                        : ""),
                  );
                  setCopied(true);
                } catch {
                  setError(
                    "Copy unavailable. Select and copy the result text.",
                  );
                }
              }}
            >
              {copied ? "Copied" : "Copy result"}
            </button>
            {output.note && <p className="result-note">{output.note}</p>}
          </>
        ) : (
          <div className="empty-result" aria-hidden="true">
            —
          </div>
        )}
      </section>
    </div>
  );
}
export default function Tool({ id }: { id: Instrument }) {
  const environment = useContext(SuiteEnvironment);
  const style = environment?.keyStyle ?? "graphite";
  const operations = OPERATIONS[id],
    [selected, setSelected] = useState(() => {
      try {
        const saved = localStorage.getItem(`graphite:operation:${id}`);
        return operations.some((o) => o.id === saved)
          ? saved!
          : operations[0].id;
      } catch {
        return operations[0].id;
      }
    });
  useEffect(() => {
    try {
      localStorage.setItem(`graphite:operation:${id}`, selected);
    } catch {
      /* Optional operation recall. */
    }
  }, [id, selected]);
  return (
    <main className="suite-tool">
      <nav className="tool-breadcrumb">
        <a href="#/">← Instruments</a>
      </nav>
      <h1>{INSTRUMENTS.find((item) => item.id === id)!.name}</h1>
      <div className="operation-tabs" role="group" aria-label="Operation">
        {operations.map((op) => (
          <button
            key={op.id}
            aria-pressed={selected === op.id}
            onClick={() => setSelected(op.id)}
          >
            {op.name}
          </button>
        ))}
      </div>
      <div
        className="calculator instrument-material specialist-material"
        data-key-style={style}
        data-shell={shellStyle(style)}
      >
        <OperationForm
          key={`${id}:${selected}`}
          tool={id}
          operation={selected}
        />
      </div>
    </main>
  );
}
