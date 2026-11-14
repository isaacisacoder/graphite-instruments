import { useEffect, useState } from "react";
import { validWindow, type GraphWindow } from "../plot";
export default function WindowSettings({
  window: w,
  onApply,
}: {
  window: GraphWindow;
  onApply: (w: GraphWindow) => void;
}) {
  const [fields, setFields] = useState({
      xmin: String(w.xmin),
      xmax: String(w.xmax),
      ymin: String(w.ymin),
      ymax: String(w.ymax),
    }),
    [error, setError] = useState("");
  useEffect(
    () =>
      setFields({
        xmin: String(w.xmin),
        xmax: String(w.xmax),
        ymin: String(w.ymin),
        ymax: String(w.ymax),
      }),
    [w],
  );
  return (
    <details className="plot-window">
      <summary>Window</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = {
            ...w,
            xmin: Number(fields.xmin),
            xmax: Number(fields.xmax),
            ymin: Number(fields.ymin),
            ymax: Number(fields.ymax),
          };
          if (
            Object.values(fields).some((v) => !v.trim()) ||
            !validWindow(next)
          ) {
            setError(
              "Minimums must be smaller than maximums. Use finite numbers.",
            );
            return;
          }
          onApply(next);
          setError("");
        }}
      >
        {(["xmin", "xmax", "ymin", "ymax"] as const).map((k) => (
          <label key={k}>
            {k}
            <input
              aria-label={k}
              inputMode="decimal"
              value={fields[k]}
              maxLength={40}
              onChange={(e) =>
                setFields((f) => ({ ...f, [k]: e.target.value }))
              }
            />
          </label>
        ))}
        <button>Apply window</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
