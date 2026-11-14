import SiteFooter from "./SiteFooter";
import Appearance from "./Appearance";
import { useUndo } from "./useUndo";
import type { Action } from "./state";
import { useContext, useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { reducer, restoreState } from "./state";
import { keyboardKey, readKeyboardMode, KEYBOARD_REFERENCE } from "./keyboard";
import KeyboardModePicker from "./KeyboardModePicker";
import Keypad from "./Keypad";
import Screen from "./Screen";
import { useKeyFeedback } from "./useKeyFeedback";
import KeyStylePicker, { readKeyStyle, shellStyle } from "./KeyStylePicker";
import "./keyStyles.css";
import "./colorways.css";
import BackgroundPicker, {
  BACKGROUNDS,
  readBackground,
} from "./BackgroundPicker";
import { SuiteEnvironment } from "./suite/environment";
import { routeFromHash } from "./suite/catalog";
export default function App({ active = true }: { active?: boolean }) {
  const edits = useUndo(
      restoreState,
      active,
      (a, b) =>
        a.entry !== b.entry ||
        a.ans !== b.ans ||
        a.functions !== b.functions ||
        a.window !== b.window ||
        a.draft !== b.draft,
    ),
    state = edits.state;
  const dispatch = (action: Action) =>
    edits.set(
      (s) => reducer(s, action),
      action.type === "edit" ? "typing" : undefined,
    );
  const [help, setHelp] = useState(false);
  const environment = useContext(SuiteEnvironment);
  const isSuite = Boolean(environment);
  const [localBackground, setLocalBackground] = useState(readBackground);
  const background = environment?.background ?? localBackground,
    setBackground = environment?.setBackground ?? setLocalBackground;
  const darkBackground =
    BACKGROUNDS.find((theme) => theme.id === background)?.dark ?? false;
  useEffect(() => {
    try {
      localStorage.setItem("graphite84:background", background);
    } catch {
      /* A background still works without storage. */
    }
  }, [background]);
  const [localKeyStyle, setLocalKeyStyle] = useState(readKeyStyle);
  const keyStyle = environment?.keyStyle ?? localKeyStyle,
    setKeyStyle = environment?.setKeyStyle ?? setLocalKeyStyle;
  const [keyboardMode, setKeyboardMode] = useState(readKeyboardMode);
  useEffect(() => {
    try {
      localStorage.setItem("graphite84:keyboard", keyboardMode);
    } catch {
      /* Optional preference. */
    }
  }, [keyboardMode]);
  useEffect(() => {
    try {
      localStorage.setItem("graphite84:key-style", keyStyle);
    } catch {
      /* Styling remains available without storage. */
    }
  }, [keyStyle]);
  const instrument = useRef<HTMLDivElement>(null);
  const heldKeys = useRef(new Map<string, string>());
  const localKeys = useKeyFeedback(!environment);
  const { sound, setSound, feedback, release } = environment?.keys ?? localKeys;
  useEffect(() => {
    try {
      localStorage.setItem(
        "graphite84:v1",
        JSON.stringify({
          angle: state.angle,
          window: state.window,
          functions: state.functions,
          history: state.history,
          ans: state.ans,
          variables: state.variables,
        }),
      );
    } catch {
      /* Calculator remains usable when storage is unavailable. */
    }
  }, [
    state.angle,
    state.window,
    state.functions,
    state.history,
    state.ans,
    state.variables,
  ]);
  useEffect(() => {
    if (!active) return;
    const listener = (e: KeyboardEvent) => {
      if (isSuite && routeFromHash() !== "graphing") return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("[data-appearance]")
      )
        return;
      if (e.target instanceof HTMLSelectElement) return;
      const key = keyboardKey(e, keyboardMode);
      const nativeButton =
        (e.target instanceof HTMLButtonElement ||
          e.target instanceof HTMLAnchorElement) &&
        ["Enter", " "].includes(e.key);
      if (nativeButton) return;
      if (key && !e.repeat) {
        heldKeys.current.set(e.code || e.key.toLowerCase(), key);
        feedback(key, true);
      }
      const shortcut =
        /^F[1-7]$/.test(e.key) || e.key === "Home" || e.key === "PageUp";
      if (
        keyboardMode === "typing" &&
        !shortcut &&
        (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement)
      )
        return;
      if (key) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat && ["2ND", "ALPHA", "ENTER"].includes(key)) return;
        if (
          e.target instanceof HTMLInputElement &&
          e.target.closest(".calculator")
        )
          dispatch({
            type: "selection",
            start: e.target.selectionStart ?? 0,
            end: e.target.selectionEnd ?? 0,
          });
        dispatch({ type: "key", key });
      }
    };
    window.addEventListener("keydown", listener, true);
    const keyup = (e: KeyboardEvent) => {
      const identity = e.code || e.key.toLowerCase();
      const key =
        heldKeys.current.get(identity) ?? keyboardKey(e, keyboardMode);
      if (key) release(key);
      heldKeys.current.delete(identity);
    };
    const blur = () => heldKeys.current.clear();
    window.addEventListener("blur", blur);
    window.addEventListener("keyup", keyup);
    return () => {
      for (const key of heldKeys.current.values()) release(key);
      heldKeys.current.clear();
      window.removeEventListener("keydown", listener, true);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    };
  }, [feedback, release, keyboardMode, active, isSuite]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = animate(instrument.current!, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 420,
      ease: "outQuad",
    });
    return () => {
      animation.pause();
    };
  }, []);
  const press = (key: string, held = false) => {
    feedback(key, held);
    const input = document.activeElement;
    if (input instanceof HTMLInputElement && input.closest(".calculator")) {
      dispatch({
        type: "selection",
        start: input.selectionStart ?? 0,
        end: input.selectionEnd ?? 0,
      });
      input.blur();
    }
    dispatch({ type: "key", key });
  };
  return (
    <div
      className={`workspace ${darkBackground ? "dark" : "light"}`}
      data-background={background}
    >
      <header className="site-header">
        <a className="wordmark" href="#/" aria-label="Graphite home">
          <span className="brand-symbol">g.</span>
          <span>
            GRAPHITE
            <span className="brand-divider" />
            INSTRUMENTS
          </span>
        </a>
        <div className="header-actions">
          {environment ? (
            <Appearance />
          ) : (
            <>
              {" "}
              <button
                className="sound-toggle"
                onClick={() => setSound((v) => !v)}
                aria-label="Key sounds"
                aria-pressed={sound}
              >
                Sound {sound ? "on" : "off"}
              </button>
              <BackgroundPicker value={background} onChange={setBackground} />
            </>
          )}
          <button onClick={() => setHelp((v) => !v)} aria-expanded={help}>
            Keyboard guide <span>↗</span>
          </button>
        </div>
      </header>
      <main aria-label="Scientific and graphing calculator">
        <div className="calculator-stage">
          {environment && (
            <nav className="instrument-navigation" aria-label="Graphing views">
              <a href="#/">← Instruments</a>
              <span>84</span>
              <a href="#/plot">Graph workspace</a>
              <a href="#/surface">3D ↗</a>
            </nav>
          )}
          <div className="instrument-controls">
            <div className="edit-history">
              <button disabled={!edits.canUndo} onClick={edits.undo}>
                Undo
              </button>
              <button disabled={!edits.canRedo} onClick={edits.redo}>
                Redo
              </button>
            </div>
            <KeyboardModePicker
              value={keyboardMode}
              onChange={setKeyboardMode}
            />
            {!environment && (
              <KeyStylePicker value={keyStyle} onChange={setKeyStyle} />
            )}
          </div>
          <div
            className="calculator"
            data-key-style={keyStyle}
            data-shell={shellStyle(keyStyle)}
            ref={instrument}
          >
            <div className="hardware-brand">
              <span>
                <strong>GRAPHITE</strong> 84<span className="plus"> PLUS</span>
              </span>
              <span className="edition">SCIENTIFIC / GRAPHING</span>
            </div>
            <div className="screen-bezel">
              <Screen state={state} dispatch={dispatch} />
            </div>
            <div className="hardware-seam" />
            <Keypad
              press={press}
              release={release}
              second={state.second}
              alpha={state.alpha}
            />
            <div className="hardware-footer">
              <span className="hardware-mark">g.</span>
            </div>
          </div>
        </div>
        {help && (
          <aside className="guide" aria-label="Keyboard guide">
            <div>
              <h2>Keyboard guide</h2>
              <button
                onClick={() => setHelp(false)}
                aria-label="Close keyboard guide"
              >
                ×
              </button>
            </div>
            {keyboardMode === "ti84" ? (
              <>
                <p>
                  TI-84 mapping is active, including in display fields. Select
                  Typing above the calculator to enter function names directly.
                </p>
                <table className="keyboard-reference">
                  <thead>
                    <tr>
                      <th>Calculator</th>
                      <th>Windows / Mac</th>
                      <th>Chromebook</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KEYBOARD_REFERENCE.map(([label, computer, chromebook]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>{computer}</td>
                        <td>{chromebook}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  Function keys may need Fn on your keyboard. Search shortcuts
                  work when ChromeOS forwards them to the page. System and
                  browser shortcuts can take priority.
                </p>
              </>
            ) : (
              <>
                <dl>
                  <dt>0–9, + − * / ^ ( )</dt>
                  <dd>Type an expression</dd>
                  <dt>Enter / Backspace</dt>
                  <dd>Evaluate / delete</dd>
                  <dt>Esc / Home</dt>
                  <dd>Clear / return home</dd>
                  <dt>F1 · F2 · F3 · F4 · F5</dt>
                  <dd>Y= · Window · Zoom · Trace · Graph</dd>
                  <dt>F6 / F7</dt>
                  <dd>2nd / ALPHA</dd>
                  <dt>Arrow keys</dt>
                  <dd>Move cursor, navigate, trace</dd>
                  <dt>2nd → mode</dt>
                  <dd>Return home, keeping your work</dd>
                </dl>
                <p>
                  Click any display field to type directly. Use{" "}
                  <code>sin(</code>, <code>sqrt(</code>, <code>pi</code>, and{" "}
                  <code>Ans</code>.
                </p>
                <p>
                  STO→ saves Ans to a variable. STAT summarizes calculation
                  history.
                </p>
              </>
            )}
          </aside>
        )}
      </main>
      <footer className="site-footer">
        <span>
          GRAPHITE 84 <span> / </span> WEB EDITION
        </span>
        <button onClick={() => setHelp((v) => !v)}>
          QUICK GUIDE <span>↗</span>
        </button>
      </footer><SiteFooter/>
    </div>
  );
}
