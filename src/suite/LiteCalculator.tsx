import { useUndo } from "../useUndo";
import type { Action } from "../state";
import { useContext, useLayoutEffect, useRef, useEffect } from "react";
import { SuiteEnvironment } from "./environment";
import { shellStyle } from "../KeyStylePicker";
import HardwareButton from "../HardwareButton";
import { MathPreview } from "../MathInput";
import { reducer } from "../state";
import { numberText, evaluate } from "../math";
import { keyboardKey } from "../keyboard";
import { routeFromHash } from "./catalog";
import { restoreLite } from "./liteState";
export default function LiteCalculator({
  scientific = false,
}: {
  scientific?: boolean;
}) {
  const environment = useContext(SuiteEnvironment);
  const style = environment?.keyStyle ?? "graphite";
  const storageKey = `graphite:lite:${scientific ? "scientific" : "basic"}`;
  const edits = useUndo(
    () => {
      try {
        return restoreLite(localStorage.getItem(storageKey));
      } catch {
        /* Optional draft. */
      }
      return restoreLite(null);
    },
    true,
    (a, b) =>
      a.entry !== b.entry ||
      a.ans !== b.ans ||
      a.functions !== b.functions ||
      a.window !== b.window ||
      a.draft !== b.draft,
  );
  const s = edits.state;
  const dispatch = (action: Action) =>
    edits.set(
      (s) => reducer(s, action),
      action.type === "edit" ? "typing" : undefined,
    );
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (routeFromHash() !== (scientific ? "scientific" : "basic")) return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLButtonElement &&
          ["Enter", " "].includes(event.key))
      )
        return;
      const mapped = keyboardKey(event, "typing");
      if (
        mapped &&
        [
          "Y=",
          "WINDOW",
          "ZOOM",
          "TRACE",
          "GRAPH",
          "2ND",
          "ALPHA",
          "HOME",
          "HISTORY",
          "ArrowUp",
          "ArrowDown",
        ].includes(mapped)
      )
        return;
      if (mapped) {
        event.preventDefault();
        if (event.repeat && mapped === "ENTER") return;
        environment?.keys.feedback(mapped);
        dispatch({ type: "key", key: mapped });
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [scientific, environment]);
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          entry: s.entry,
          history: s.history,
          ans: s.ans,
          angle: s.angle,
          afterResult: s.afterResult,
        }),
      );
    } catch {
      /* Optional draft. */
    }
  }, [s.entry, s.history, s.ans, s.angle, s.afterResult, storageKey]);
  useLayoutEffect(() => {
    if (
      input.current &&
      (input.current.selectionStart !== s.cursor ||
        input.current.selectionEnd !== (s.selectionEnd ?? s.cursor))
    )
      input.current.setSelectionRange(s.cursor, s.selectionEnd ?? s.cursor);
  }, [s.cursor, s.selectionEnd, s.entry]);
  const key = (key: string) => {
    const active = input.current;
    if (active && document.activeElement === active)
      dispatch({
        type: "selection",
        start: active.selectionStart ?? s.cursor,
        end: active.selectionEnd ?? s.cursor,
      });
    if (key === "(−)") {
      try {
        const value = numberText(
          -evaluate(s.entry || numberText(s.ans), s.angle, s.ans),
        );
        dispatch({ type: "edit", value, cursor: value.length });
        return;
      } catch {
        /* An incomplete expression accepts a unary negative at the cursor. */
      }
    }
    dispatch({ type: "key", key });
  };
  const basic = [
    ["CLEAR", "C"],
    ["DEL", "⌫"],
    ["%", "%"],

    ["÷", "÷"],
    ["7", "7"],
    ["8", "8"],
    ["9", "9"],
    ["×", "×"],
    ["4", "4"],
    ["5", "5"],
    ["6", "6"],
    ["−", "−"],
    ["1", "1"],
    ["2", "2"],
    ["3", "3"],
    ["+", "+"],
    ["(−)", "±"],
    ["0", "0"],
    [".", "."],
    ["ENTER", "="],
  ];
  const functions = [
    ["SIN", "sin"],
    ["COS", "cos"],
    ["TAN", "tan"],
    ["sqrt(", "√"],
    ["LOG", "log"],
    ["LN", "ln"],
    ["^", "xʸ"],
    ["x²", "x²"],
    ["(", "("],
    [")", ")"],
    ["pi", "π"],
    ["Ans", "Ans"],
  ];
  return (
    <main className="suite-lite">
      <nav className="tool-breadcrumb">
        <a href="#/">← Instruments</a>
      </nav>
      <h1>{scientific ? "Scientific" : "Basic"}</h1>
      <div
        className={`calculator instrument-material desktop-calculator ${scientific ? "scientific" : ""}`}
        data-key-style={style}
        data-shell={shellStyle(style)}
      >
        <div className="lite-top">
          <span>GRAPHITE</span>
          <div className="edit-history">
            <button disabled={!edits.canUndo} onClick={edits.undo}>
              Undo
            </button>
            <button disabled={!edits.canRedo} onClick={edits.redo}>
              Redo
            </button>
          </div>
          <button
            className="lite-ac"
            aria-label="All clear"
            onClick={() => key("AC")}
          >
            AC
          </button>
          {scientific && (
            <select
              aria-label="Angle unit"
              value={s.angle}
              onChange={(e) =>
                dispatch({
                  type: "angle",
                  angle: e.target.value === "DEG" ? "DEG" : "RAD",
                })
              }
            >
              <option>RAD</option>
              <option>DEG</option>
            </select>
          )}
        </div>
        <div className="lite-display">
          <div className="lite-last">{s.history.at(-1)?.expression ?? " "}</div>
          <output aria-live="polite">{numberText(s.ans)}</output>
          <input
            ref={input}
            aria-label="Expression"
            value={s.entry}
            spellCheck={false}
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
              if (e.key === "Enter") {
                if (e.repeat) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                key("ENTER");
              } else if (e.key === "Escape") {
                e.preventDefault();
                key("CLEAR");
              } else if (
                s.afterResult &&
                !s.entry &&
                ["+", "-", "*", "/", "^", "!", "%"].includes(e.key)
              ) {
                e.preventDefault();
                key(e.key);
              }
            }}
          />
          {s.error && (
            <p className="lite-error" role="alert">
              {s.error}
            </p>
          )}
          <MathPreview value={s.entry} angle={s.angle} />
        </div>
        {scientific && (
          <div className="lite-functions">
            {functions.map(([code, label]) => (
              <HardwareButton
                keyCode={code}
                press={(code, held) => {
                  environment?.keys.feedback(code, held);
                  key(code);
                }}
                release={(code) => environment?.keys.release(code)}
                key={code}
                data-key-code={code}
              >
                {label}
              </HardwareButton>
            ))}
          </div>
        )}
        <div className="lite-keys">
          {basic.map(([code, label]) => (
            <HardwareButton
              keyCode={code}
              press={(code, held) => {
                environment?.keys.feedback(code, held);
                key(code);
              }}
              release={(code) => environment?.keys.release(code)}
              key={code}
              data-key-code={code}
              className={
                code === "ENTER"
                  ? "lite-enter"
                  : ["+", "−", "×", "÷"].includes(code)
                    ? "lite-operator"
                    : ""
              }
              aria-label={
                code === "ENTER"
                  ? "Evaluate"
                  : code === "DEL"
                    ? "Delete"
                    : code === "CLEAR"
                      ? "Clear"
                      : label
              }
            >
              {label}
            </HardwareButton>
          ))}
        </div>
      </div>
      {s.history.length > 0 && (
        <section className="lite-history" aria-label="Calculation history">
          {s.history.slice(-5).map((h, i) => (
            <button
              key={i}
              onClick={() =>
                dispatch({
                  type: "recall",
                  index: Math.max(0, s.history.length - 5) + i,
                })
              }
            >
              <span>{h.expression}</span>
              <strong>{numberText(h.result)}</strong>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
