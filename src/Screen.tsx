import { useLayoutEffect, useRef, useState, type Dispatch } from "react";
import Graph from "./Graph";
import { MENUS, WINDOW_KEYS, type Action, type State } from "./state";
import { COLORS } from "./plot";
import { compileExpression, numberText } from "./math";
function Editor({
  value,
  s,
  dispatch,
  label,
}: {
  value: string;
  s: State;
  dispatch: Dispatch<Action>;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const input = ref.current;
    if (input) {
      if (
        input.selectionStart !== s.cursor ||
        input.selectionEnd !== (s.selectionEnd ?? s.cursor)
      )
        input.setSelectionRange(s.cursor, s.selectionEnd ?? s.cursor);
      const characterWidth =
        (parseFloat(getComputedStyle(input).fontSize) || 14) * 0.6;
      const scroll = Math.max(
        0,
        s.cursor * characterWidth - input.clientWidth + characterWidth,
      );
      input.scrollLeft = scroll;
      setOffset(scroll);
    }
  }, [s.cursor, s.selectionEnd, value]);
  return (
    <span className="editor">
      <input
        ref={ref}
        aria-label={label}
        value={value}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) =>
          dispatch({
            type: "edit",
            value: e.target.value,
            cursor: e.target.selectionStart ?? e.target.value.length,
          })
        }
        onSelect={(e) => {
          const cursor = e.currentTarget.selectionStart ?? 0;
          if (
            cursor !== s.cursor ||
            e.currentTarget.selectionEnd !== s.selectionEnd
          )
            dispatch({
              type: "selection",
              start: cursor,
              end: e.currentTarget.selectionEnd ?? cursor,
            });
        }}
        onKeyDown={(e) => {
          if (
            s.screen === "home" &&
            s.afterResult &&
            !value &&
            ["+", "-", "*", "/", "^", "!", "%"].includes(e.key)
          ) {
            e.preventDefault();
            dispatch({ type: "key", key: e.key });
            return;
          }
          if (e.key === "Enter" && e.repeat) {
            e.preventDefault();
            return;
          }
          if (
            e.key === "Enter" ||
            e.key === "Escape" ||
            e.key === "ArrowUp" ||
            e.key === "ArrowDown"
          ) {
            e.preventDefault();
            dispatch({
              type: "key",
              key:
                e.key === "Enter"
                  ? "ENTER"
                  : e.key === "Escape"
                    ? "HOME"
                    : e.key,
            });
          }
        }}
      />
      {!focused && (
        <span
          className="editor-cursor"
          aria-hidden="true"
          style={{ left: `max(0px, calc(${s.cursor} * .6em - ${offset}px))` }}
        />
      )}
    </span>
  );
}
export default function Screen({
  state: s,
  dispatch,
}: {
  state: State;
  dispatch: Dispatch<Action>;
}) {
  const content = useRef<HTMLDivElement>(null);
  const previousResult = useRef(s.history.at(-1));
  const [freshResult, setFreshResult] = useState(false);
  useLayoutEffect(() => {
    const latest = s.history.at(-1);
    if (latest && latest !== previousResult.current) {
      setFreshResult(true);
      previousResult.current = latest;
      const timer = setTimeout(() => setFreshResult(false), 180);
      return () => clearTimeout(timer);
    }
  }, [s.history]);
  useLayoutEffect(() => {
    const recent = content.current?.querySelector(".recent");
    if (recent) recent.scrollTop = recent.scrollHeight;
  }, [s.history.length, s.screen]);
  useLayoutEffect(() => {
    const selected = content.current?.querySelector(".selected");
    if (
      selected instanceof HTMLElement &&
      typeof selected.scrollIntoView === "function"
    )
      selected.scrollIntoView({ block: "nearest" });
  }, [s.selected]);
  const title = {
    home: "HOME",
    functions: "FUNCTION EDITOR",
    graph: s.trace ? "TRACE" : "GRAPH",
    window: "WINDOW",
    mode: "MODE",
    history: "HISTORY",
    menu: s.menu,
  }[s.screen];
  return (
    <div className={`lcd ${!s.powered ? "off" : ""}`}>
      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {s.history.length
          ? `Last result: ${numberText(s.ans)}`
          : "Ready for calculation"}
      </output>
      <div className="lcd-status">
        <span>NORMAL · FLOAT · {s.angle}</span>
        <span>
          {s.second ? "2ND" : s.alpha ? "ALPHA" : ""}{" "}
          <span className="battery" aria-label="Powered on" />
        </span>
      </div>
      <div className="lcd-heading">
        <span>{title}</span>
        <span>
          {s.screen === "home"
            ? "REAL"
            : s.screen === "functions"
              ? "Y₁ — Y₆"
              : "84"}
        </span>
      </div>
      <div className="screen-content" key={s.screen} ref={content}>
        {s.screen === "home" && (
          <div className="home-screen">
            <div className="recent">
              {s.history.slice(-3).map((h, i) => (
                <button
                  className={`history-pair ${i === Math.min(3, s.history.length) - 1 ? "latest-result" : ""} ${freshResult && i === Math.min(3, s.history.length) - 1 ? "result-arrived" : ""}`}
                  key={s.history.length - 3 + i}
                  onClick={() =>
                    dispatch({
                      type: "recall",
                      index: Math.max(0, s.history.length - 3) + i,
                    })
                  }
                >
                  <span>{h.expression}</span>
                  <strong>{numberText(h.result)}</strong>
                </button>
              ))}
            </div>
            <div className="entry-line">
              <span>›</span>
              <Editor
                value={s.entry}
                s={s}
                dispatch={dispatch}
                label="Calculation expression"
              />
            </div>
          </div>
        )}
        {s.screen === "functions" && (
          <div className="function-list">
            {s.functions.map((f, i) => (
              <div
                key={i}
                className={`function-row ${s.selected === i ? "selected" : ""}`}
              >
                <button
                  aria-label={`Toggle Y${i + 1}`}
                  aria-pressed={f.enabled}
                  onClick={() => dispatch({ type: "toggle", index: i })}
                  style={{ color: COLORS[i] }}
                >
                  {f.enabled ? "■" : "□"}
                </button>
                <button
                  className="function-name"
                  onClick={() => dispatch({ type: "select", index: i })}
                >
                  Y{i + 1}=
                </button>
                {s.selected === i ? (
                  <Editor
                    value={f.expression}
                    s={s}
                    dispatch={dispatch}
                    label={`Y${i + 1} expression`}
                  />
                ) : (
                  <button
                    className="expression-select"
                    onClick={() => dispatch({ type: "select", index: i })}
                  >
                    {f.expression || " "}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {s.screen === "graph" && <Graph state={s} dispatch={dispatch} />}
        {s.screen === "window" && (
          <div className="window-list">
            {WINDOW_KEYS.map((k, i) => (
              <div key={k} className={s.selected === i ? "selected" : ""}>
                <button onClick={() => dispatch({ type: "select", index: i })}>
                  {k}=
                </button>
                {s.selected === i ? (
                  <Editor
                    value={s.draft[i]}
                    s={s}
                    dispatch={dispatch}
                    label={k}
                  />
                ) : (
                  <button
                    onClick={() => dispatch({ type: "select", index: i })}
                  >
                    {s.draft[i]}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {s.screen === "mode" && (
          <div className="mode-screen">
            <p>ANGLE UNIT</p>
            <div>
              {(["RAD", "DEG"] as const).map((angle) => (
                <button
                  key={angle}
                  className={s.angle === angle ? "selected" : ""}
                  aria-pressed={s.angle === angle}
                  onClick={() => dispatch({ type: "angle", angle })}
                >
                  {angle === "RAD" ? "RADIAN" : "DEGREE"}
                </button>
              ))}
            </div>
            <p>Real numbers · 12 digit display</p>
            <p>Settings are saved automatically.</p>
            <button
              onClick={() => dispatch({ type: "screen", screen: "home" })}
            >
              Return to calculation →
            </button>
          </div>
        )}
        {s.screen === "history" && (
          <div className="history-list">
            {!s.history.length ? (
              <p>No calculations yet.</p>
            ) : (
              s.history.map((h, i) => (
                <button
                  key={i}
                  className={i === s.selected ? "selected" : ""}
                  onClick={() => dispatch({ type: "recall", index: i })}
                >
                  <span>{h.expression}</span>
                  <strong>{numberText(h.result)}</strong>
                </button>
              ))
            )}
          </div>
        )}
        {s.screen === "menu" && (
          <div className="menu-screen">
            {s.menu === "PRGM" && <p>TI program execution is not supported.</p>}
            {s.menu === "INFO" && (
              <p>
                Use MATH for supported functions. TI-BASIC and external apps are
                not available.
              </p>
            )}
            {s.menu === "TABLE" ? (
              <table>
                <thead>
                  <tr>
                    <th>x</th>
                    <th>Y1</th>
                    <th>Y2</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }, (_, i) => i - 2).map((x) => (
                    <tr key={x}>
                      <td>{x}</td>
                      {s.functions.slice(0, 2).map((f, i) => {
                        let value = "—";
                        try {
                          if (f.expression)
                            value = numberText(
                              compileExpression(
                                f.expression,
                                s.angle,
                                s.ans,
                                s.variables,
                              )(x),
                            );
                        } catch {
                          value = "undef";
                        }
                        return <td key={i}>{value}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              MENUS[s.menu]?.map((item, i) => (
                <button
                  key={item.key}
                  className={s.selected === i ? "selected" : ""}
                  onClick={() => {
                    dispatch({ type: "select", index: i });
                    dispatch({ type: "key", key: "ENTER" });
                  }}
                >
                  {i + 1}: {item.label}
                  {s.menu === "VARS" && s.variables[item.key] !== undefined
                    ? ` = ${numberText(s.variables[item.key])}`
                    : ""}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {s.error && (
        <div className="screen-error" role="alert">
          <strong>ERR</strong> {s.error}
        </div>
      )}
      <div className="lcd-footer">
        {s.screen === "home"
          ? "ENTER evaluate    ↑ history"
          : s.screen === "functions"
            ? "■ plot on/off    GRAPH to draw"
            : s.screen === "graph"
              ? "← → trace    ↑ ↓ function"
              : "↑ ↓ navigate    2nd MODE quit"}
      </div>
    </div>
  );
}
