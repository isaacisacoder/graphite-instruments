import { parseDelimited, encodeDelimited, parseMatrixText } from "./delimited";
import { useId, useState } from "react";
import { num } from "./numeric";
export default function MatrixInput({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(false),
    [error, setError] = useState("");
  const id = useId();
  const grid = (() => {
      try {
        return parseMatrixText(value);
      } catch {
        return [[value]];
      }
    })(),
    rows = Math.min(6, Math.max(1, grid.length)),
    cols = Math.min(6, Math.max(1, ...grid.map((r) => r.length)));
  const resize = (r: number, c: number) =>
    onChange(
      encodeDelimited(
        Array.from({ length: r }, (_, i) =>
          Array.from({ length: c }, (_, j) => grid[i]?.[j] ?? "0"),
        ),
      ),
    );
  return (
    <div className="matrix-entry">
      <div className="matrix-entry-tools">
        <button
          type="button"
          aria-pressed={text}
          onClick={() => setText(!text)}
        >
          {text ? "Grid editor" : "Text editor"}
        </button>
        {!text && (
          <>
            <label>
              Rows
              <select
                aria-label={`${label} rows`}
                value={rows}
                onChange={(e) => resize(Number(e.target.value), cols)}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Columns
              <select
                aria-label={`${label} columns`}
                value={cols}
                onChange={(e) => resize(rows, Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      {text ? (
        <textarea
          aria-label={label}
          rows={5}
          maxLength={5000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <table aria-label={label}>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: cols }, (_, j) => (
                  <td key={j}>
                    <input
                      id={`${id}-${i}-${j}`}
                      aria-label={`${label} row ${i + 1} column ${j + 1}`}
                      value={grid[i]?.[j] ?? ""}
                      maxLength={80}
                      onChange={(e) => {
                        const next = Array.from({ length: rows }, (_, r) =>
                          Array.from(
                            { length: cols },
                            (_, c) => grid[r]?.[c] ?? "",
                          ),
                        );
                        next[i][j] = e.target.value;
                        onChange(encodeDelimited(next));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          document
                            .getElementById(`${id}-${(i + 1) % rows}-${j}`)
                            ?.focus();
                        }
                      }}
                      onPaste={(e) => {
                        const raw = e.clipboardData.getData("text");
                        if (!/[,\t\n]/.test(raw)) return;
                        e.preventDefault();
                        try {
                          const paste = parseDelimited(raw);
                          if (
                            !paste.length ||
                            paste.some((r) => r.length !== paste[0].length) ||
                            i + paste.length > 6 ||
                            j + paste[0].length > 6
                          )
                            throw Error(
                              "Paste a rectangular matrix within 6 × 6",
                            );
                          paste.forEach((r, ri) =>
                            r.forEach((v, ci) => {
                              try {
                                num(v, "Cell");
                              } catch {
                                throw Error(
                                  `Row ${i + ri + 1}, column ${j + ci + 1}: invalid value`,
                                );
                              }
                            }),
                          );
                          const nr = Math.max(rows, i + paste.length),
                            nc = Math.max(cols, j + paste[0].length),
                            next = Array.from({ length: nr }, (_, r) =>
                              Array.from(
                                { length: nc },
                                (_, c) => grid[r]?.[c] ?? "0",
                              ),
                            );
                          paste.forEach((r, ri) =>
                            r.forEach((v, ci) => (next[i + ri][j + ci] = v)),
                          );
                          onChange(encodeDelimited(next));
                          setError("");
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Invalid paste",
                          );
                        }
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
