import ParameterControl from "./ParameterControl";
import WindowSettings from "./WindowSettings";
import PointEditor from "./PointEditor";
import GraphFiles from "./GraphFiles";
import { useId, useMemo, useState } from "react";
import { parse } from "mathjs/number";
import MathInput from "../MathInput";
import type { Commit } from "../useUndo";
import { type GraphWindow } from "../plot";
import { newId, parameterValues, type PlotDraft } from "./plotModel";
import GraphAnalysis, { type Shade } from "./GraphAnalysis";
interface Props {
  draft: PlotDraft;
  setDraft: Commit<PlotDraft>;
  placing: boolean;
  setPlacing: (value: boolean) => void;
  errors: string[];
  onWindowChange: (window: GraphWindow) => void;
  onShade: (shade: Shade | null) => void;
}
export default function PlotEditor({
  draft,
  setDraft,
  placing,
  setPlacing,
  errors,
  onWindowChange,
  onShade,
}: Props) {
  const [tab, setTab] = useState("functions"),
    [height, setHeight] = useState("medium");
  const clip = useId(),
    variables = useMemo(() => parameterValues(draft), [draft.parameters]),
    angle = draft.degrees ? "DEG" : "RAD";
  const unknown = new Set<string>();
  for (const c of draft.curves)
    try {
      parse(c.expression).traverse((n) => {
        if (n.type === "SymbolNode") {
          const name = (n as unknown as { name: string }).name;
          if (/^[a-df-wyz]$/.test(name) && !(name in variables))
            unknown.add(name);
        }
      });
    } catch {
      /* Partial expressions are editable. */
    }
  return (
    <aside
      className={`plot-editor editor-${height}`}
      aria-label="Graph expressions and points"
    >
      <div className="mobile-editor-controls">
        <div role="tablist" aria-label="Graph editor">
          {["functions", "points", "window"].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              tabIndex={tab === t ? 0 : -1}
              onKeyDown={(event) => {
                const values = ["functions", "points", "window"];
                let index = values.indexOf(tab);
                if (event.key === "ArrowRight") index = (index + 1) % 3;
                else if (event.key === "ArrowLeft") index = (index + 2) % 3;
                else if (event.key === "Home") index = 0;
                else if (event.key === "End") index = 2;
                else return;
                event.preventDefault();
                setTab(values[index]);
                const controls =
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]',
                  );
                controls?.[index].focus();
                if (height === "collapsed") setHeight("medium");
              }}
              aria-controls={`${clip}-${t}`}
              onClick={() => {
                setTab(t);
                if (height === "collapsed") setHeight("medium");
              }}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <select
          aria-label="Editor height"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        >
          <option value="collapsed">Collapsed</option>
          <option value="medium">Half height</option>
          <option value="large">Expanded</option>
        </select>
      </div>
      <div
        id={`${clip}-functions`}
        className={`editor-panel ${tab === "functions" ? "selected-panel" : ""}`}
      >
        <div className="plot-editor-heading">
          <h2>Functions</h2>
          <select
            aria-label="Graph angle unit"
            value={angle}
            onChange={(e) =>
              setDraft((d) => ({ ...d, degrees: e.target.value === "DEG" }))
            }
          >
            <option>RAD</option>
            <option>DEG</option>
          </select>
        </div>
        {draft.curves.map((c, i) => (
          <div className="plot-expression" key={c.id} data-curve={i % 6}>
            <div>
              <label className="curve-toggle">
                <input
                  type="checkbox"
                  aria-label={`Show Y${i + 1}`}
                  checked={c.enabled}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      curves: d.curves.map((v) =>
                        v.id === c.id ? { ...v, enabled: e.target.checked } : v,
                      ),
                    }))
                  }
                />
                <span>Y{i + 1}</span>
              </label>
              <button
                aria-label={`Remove Y${i + 1}`}
                disabled={draft.curves.length === 1}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    curves: d.curves.filter((v) => v.id !== c.id),
                  }))
                }
              >
                ×
              </button>
            </div>
            <MathInput
              label={`Y${i + 1} expression`}
              value={c.expression}
              angle={angle}
              variables={variables}
              onChange={(value) =>
                setDraft(
                  (d) => ({
                    ...d,
                    curves: d.curves.map((v) =>
                      v.id === c.id ? { ...v, expression: value } : v,
                    ),
                  }),
                  `curve:${c.id}`,
                )
              }
            />
            {errors[i] && <p role="alert">{errors[i]}</p>}
          </div>
        ))}
        <button
          disabled={draft.curves.length >= 12}
          onClick={() =>
            setDraft((d) => ({
              ...d,
              curves: [
                ...d.curves,
                { id: newId(), expression: "", enabled: true },
              ],
            }))
          }
        >
          Add function
        </button>
        {unknown.size > 0 && (
          <div className="parameter-suggestions">
            {[...unknown].map((name) => (
              <button
                key={name}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    parameters: [
                      ...d.parameters,
                      {
                        id: newId(),
                        name,
                        value: 1,
                        min: -10,
                        max: 10,
                        step: 0.1,
                      },
                    ],
                  }))
                }
              >
                Add slider {name}
              </button>
            ))}
          </div>
        )}
        {draft.parameters.map((p) => (
          <ParameterControl
            key={p.id}
            parameter={p}
            update={(next, group) =>
              setDraft(
                (d) => ({
                  ...d,
                  parameters: d.parameters.map((v) =>
                    v.id === p.id ? next : v,
                  ),
                }),
                group,
              )
            }
            remove={() =>
              setDraft((d) => ({
                ...d,
                parameters: d.parameters.filter((v) => v.id !== p.id),
              }))
            }
          />
        ))}
        <GraphAnalysis draft={draft} onShade={onShade} />
      </div>
      <div
        id={`${clip}-points`}
        className={`editor-panel ${tab === "points" ? "selected-panel" : ""}`}
      >
        <PointEditor
          draft={draft}
          setDraft={setDraft}
          placing={placing}
          setPlacing={setPlacing}
        />
      </div>
      <div
        id={`${clip}-window`}
        className={`editor-panel ${tab === "window" ? "selected-panel" : ""}`}
      >
        <label className="plot-label-toggle">
          <input
            type="checkbox"
            checked={draft.equalUnits}
            onChange={(e) =>
              setDraft((d) => ({ ...d, equalUnits: e.target.checked }))
            }
          />
          Equal units
        </label>
        <WindowSettings window={draft.window} onApply={onWindowChange} />
        <GraphFiles draft={draft} setDraft={setDraft} />
        <p className="plot-help">
          Drag to pan. Scroll or pinch to zoom. Drag a point to move it.
        </p>
      </div>
    </aside>
  );
}
