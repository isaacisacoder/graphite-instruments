import { useMemo, useState } from "react";
import type { Commit } from "../useUndo";
import { newId, readPoint, parameterValues, type PlotDraft } from "./plotModel";
import { parsePoints } from "./graphIO";
export default function PointEditor({
  draft,
  setDraft,
  placing,
  setPlacing,
}: {
  draft: PlotDraft;
  setDraft: Commit<PlotDraft>;
  placing: boolean;
  setPlacing: (v: boolean) => void;
}) {
  const [paste, setPaste] = useState(""),
    [notice, setNotice] = useState("");
  const angle = draft.degrees ? "DEG" : "RAD",
    variables = useMemo(() => parameterValues(draft), [draft.parameters]),
    coordinates = useMemo(
      () => draft.points.map((p) => readPoint(p, angle, variables)),
      [draft.points, angle, variables],
    );
  const pasteRows = (text: string, start = 0) => {
    try {
      const rows = parsePoints(text, angle, variables);
      if (start + rows.length > 200) throw Error("Limit of 200 points");
      setDraft((d) => ({
        ...d,
        points: [
          ...d.points.slice(0, start),
          ...rows,
          ...d.points.slice(start + rows.length),
        ],
      }));
      setNotice("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Invalid pasted rows");
    }
  };
  return (
    <>
      {" "}
      <div className="plot-editor-heading">
        <h2>Points</h2>
        <button aria-pressed={placing} onClick={() => setPlacing(!placing)}>
          {placing ? "Placing points" : "Place on graph"}
        </button>
      </div>
      <table
        className="point-table"
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (!/[\n\t,]/.test(text)) return;
          e.preventDefault();
          const target = e.target as HTMLElement;
          pasteRows(
            text,
            Number(target.closest("tr")?.getAttribute("data-row") ?? 0),
          );
        }}
      >
        <thead>
          <tr>
            <th scope="col">x</th>
            <th scope="col">y</th>
            <th scope="col">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {draft.points.map((p, i) => (
            <tr
              key={p.id}
              data-row={i}
              data-invalid={
                p.x.trim() && p.y.trim() && !coordinates[i] ? true : undefined
              }
            >
              {(["x", "y"] as const).map((axis) => (
                <td key={axis}>
                  <input
                    aria-label={`Point ${i + 1} ${axis}`}
                    value={p[axis]}
                    maxLength={80}
                    spellCheck={false}
                    onChange={(e) =>
                      setDraft(
                        (d) => ({
                          ...d,
                          points: d.points.map((v) =>
                            v.id === p.id
                              ? { ...v, [axis]: e.target.value }
                              : v,
                          ),
                        }),
                        `point:${p.id}:${axis}`,
                      )
                    }
                  />
                </td>
              ))}
              <td>
                <button
                  aria-label={`Remove point ${i + 1}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      points: d.points.filter((v) => v.id !== p.id),
                    }))
                  }
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        disabled={draft.points.length >= 200}
        onClick={() =>
          setDraft((d) => ({
            ...d,
            points: [...d.points, { id: newId(), x: "", y: "" }],
          }))
        }
      >
        Add point
      </button>
      {draft.points.some(
        (p, i) => p.x.trim() && p.y.trim() && !coordinates[i],
      ) && (
        <p role="alert">
          Enter finite coordinate expressions. Angle mode applies to both
          columns.
        </p>
      )}
      <details>
        <summary>Paste coordinate data</summary>
        <label>
          CSV or tab-separated coordinates
          <textarea
            rows={4}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
        </label>
        <button onClick={() => pasteRows(paste, draft.points.length)}>
          Append rows
        </button>
      </details>
      <label className="plot-label-toggle">
        <input
          type="checkbox"
          checked={draft.labels}
          onChange={(e) =>
            setDraft((d) => ({ ...d, labels: e.target.checked }))
          }
        />
        Point labels
      </label>
      <label className="plot-label-toggle">
        <input
          type="checkbox"
          checked={draft.snap}
          onChange={(e) => setDraft((d) => ({ ...d, snap: e.target.checked }))}
        />
        Snap dragged points to grid
      </label>
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
