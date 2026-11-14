import { useEffect, useRef, useState } from "react";
import type { Parameter } from "./plotModel";
export default function ParameterControl({
  parameter: p,
  update,
  remove,
}: {
  parameter: Parameter;
  update: (p: Parameter, group?: string) => void;
  remove: () => void;
}) {
  const [fields, setFields] = useState({
      min: String(p.min),
      max: String(p.max),
      step: String(p.step),
      value: String(p.value),
    }),
    [error, setError] = useState(""),
    [running, setRunning] = useState(false);
  const current = useRef(p),
    updater = useRef(update);
  current.current = p;
  updater.current = update;
  useEffect(
    () =>
      setFields((f) => ({
        ...f,
        min: String(p.min),
        max: String(p.max),
        step: String(p.step),
      })),
    [p.min, p.max, p.step],
  );
  useEffect(() => {
    if (!running) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      setRunning(false);
      setError("Animation is off while reduced motion is enabled.");
      return;
    }
    let frame = 0,
      last = performance.now(),
      direction = 1;
    const animate = (now: number) => {
      if (now - last >= 50) {
        const p = current.current,
          delta = ((p.step * (now - last)) / 100) * direction;
        let value = p.value + delta;
        if (value > p.max) {
          value = p.max;
          direction = -1;
        }
        if (value < p.min) {
          value = p.min;
          direction = 1;
        }
        updater.current(
          { ...p, value: +value.toPrecision(10) },
          `animate:${p.id}`,
        );
        last = now;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  return (
    <div className="parameter-control">
      <div>
        <label htmlFor={p.id}>
          {p.name} = {p.value.toPrecision(5).replace(/\.?0+$/, "")}
        </label>
        <button
          aria-label={`${running ? "Pause" : "Play"} slider ${p.name}`}
          aria-pressed={running}
          onClick={() => setRunning(!running)}
        >
          {running ? "Pause" : "Play"}
        </button>
        <button aria-label={`Remove slider ${p.name}`} onClick={remove}>
          ×
        </button>
      </div>
      <input
        id={p.id}
        aria-label={`Slider ${p.name}`}
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        onChange={(e) =>
          update({ ...p, value: e.target.valueAsNumber }, `slider:${p.id}`)
        }
      />
      <details>
        <summary>Slider range</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = {
              ...p,
              min: Number(fields.min),
              max: Number(fields.max),
              step: Number(fields.step),
              value: Number(fields.value),
            };
            if (
              Object.values(fields).some((f) => !f.trim()) ||
              ![v.min, v.max, v.step, v.value].every(Number.isFinite) ||
              !Number.isFinite(v.max - v.min) ||
              v.min >= v.max ||
              v.step <= 0 ||
              v.value < v.min ||
              v.value > v.max
            ) {
              setError(
                "Use an ordered range, positive step and value inside the range.",
              );
              return;
            }
            update(v);
            setError("");
          }}
        >
          {(["min", "max", "step", "value"] as const).map((k) => (
            <label key={k}>
              {k}
              <input
                aria-label={`Slider ${p.name} ${k}`}
                value={fields[k]}
                onChange={(e) =>
                  setFields((f) => ({ ...f, [k]: e.target.value }))
                }
              />
            </label>
          ))}
          <button>Apply slider</button>
        </form>
      </details>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
