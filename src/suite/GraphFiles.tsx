import { useMemo, useRef, useState } from "react";
import type { Commit } from "../useUndo";
import { download, importWorkspace } from "./graphIO";
import { readPoint, parameterValues, type PlotDraft } from "./plotModel";
export default function GraphFiles({
  draft,
  setDraft,
}: {
  draft: PlotDraft;
  setDraft: Commit<PlotDraft>;
}) {
  const file = useRef<HTMLInputElement>(null),
    [notice, setNotice] = useState(""),
    angle = draft.degrees ? "DEG" : "RAD",
    variables = useMemo(() => parameterValues(draft), [draft.parameters]);
  return (
    <>
      {" "}
      <details>
        <summary>Workspace files</summary>
        <div className="editor-file-actions">
          <button
            onClick={() =>
              download(
                "graphite-workspace.json",
                JSON.stringify(draft, null, 2),
                "application/json",
              )
            }
          >
            Save workspace
          </button>
          <button onClick={() => file.current?.click()}>Open workspace</button>
          <button
            onClick={() =>
              download(
                "graphite-points.csv",
                "x,y\n" +
                  draft.points
                    .map((p) => {
                      const q = readPoint(p, angle, variables);
                      return q ? q.join(",") : "";
                    })
                    .filter(Boolean)
                    .join("\n"),
                "text/csv",
              )
            }
          >
            Export points CSV
          </button>
        </div>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Workspace file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            try {
              if (!f) return;
              if (f.size > 500000) throw Error("Workspace file is too large");
              setDraft(importWorkspace(await f.text()));
              setNotice("Workspace opened");
            } catch (err) {
              setNotice(
                err instanceof Error
                  ? err.message
                  : "Unable to import workspace",
              );
            } finally {
              e.target.value = "";
            }
          }}
        />
      </details>
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
