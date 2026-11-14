import { evaluate, numberText, compileExpression, type Angle } from "./math";
import { STANDARD, validWindow, zoomWindow, type GraphWindow } from "./plot";
export type Screen =
  "home" | "functions" | "graph" | "window" | "mode" | "history" | "menu";
export interface FunctionSlot {
  expression: string;
  enabled: boolean;
}
export interface HistoryEntry {
  expression: string;
  result: number;
}
export interface State {
  screen: Screen;
  entry: string;
  cursor: number;
  selectionEnd?: number;
  angle: Angle;
  ans: number;
  afterResult: boolean;
  history: HistoryEntry[];
  functions: FunctionSlot[];
  window: GraphWindow;
  draft: string[];
  selected: number;
  second: boolean;
  alpha: boolean;
  error: string;
  menu: string;
  menuTarget: {
    screen: "home" | "functions" | "window";
    selected: number;
    cursor: number;
    selectionEnd?: number;
  };
  trace: boolean;
  traceX: number;
  traceFunction: number;
  powered: boolean;
  variables: Record<string, number>;
}
export const WINDOW_KEYS = Object.keys(STANDARD) as (keyof GraphWindow)[];
export const initialState: State = {
  screen: "home",
  entry: "",
  cursor: 0,
  angle: "RAD",
  ans: 0,
  afterResult: false,
  history: [],
  functions: Array.from({ length: 6 }, (_, i) => ({
    expression: i === 0 ? "x^2" : i === 1 ? "sin(x)" : "",
    enabled: i < 2,
  })),
  window: { ...STANDARD },
  draft: WINDOW_KEYS.map((k) => String(STANDARD[k])),
  selected: 0,
  second: false,
  alpha: false,
  error: "",
  menu: "",
  menuTarget: { screen: "home", selected: 0, cursor: 0 },
  trace: false,
  traceX: 0,
  traceFunction: 0,
  powered: true,
  variables: {},
};
export type Action =
  | { type: "key"; key: string }
  | { type: "edit"; value: string; cursor: number; selectionEnd?: number }
  | { type: "select"; index: number }
  | { type: "toggle"; index: number }
  | { type: "selection"; start: number; end: number }
  | { type: "screen"; screen: Screen }
  | { type: "angle"; angle: Angle }
  | { type: "viewport"; window: GraphWindow }
  | { type: "traceAt"; x: number; index: number }
  | { type: "recall"; index: number };
export const MENUS: Record<string, { label: string; key: string }[]> = {
  MATH: [
    { label: "Square root   √(", key: "sqrt(" },
    { label: "Absolute value   abs(", key: "abs(" },
    { label: "Factorial   !", key: "!" },
    { label: "Cube   ³", key: "^3" },
    { label: "π", key: "pi" },
    { label: "Natural constant   e", key: "e" },
  ],
  APPS: [
    { label: "Function table", key: "TABLE" },
    { label: "Calculation history", key: "HISTORY" },
  ],
  PRGM: [{ label: "Programs unavailable", key: "INFO" }],
  VARS: [
    { label: "Last answer   Ans", key: "Ans" },
    ...["A", "B", "C", "D", "M"].map((key) => ({
      label: `Variable ${key}`,
      key,
    })),
  ],
  STAT: [
    { label: "History mean", key: "MEAN" },
    { label: "History sum", key: "SUM" },
    { label: "History count", key: "COUNT" },
  ],
  ZOOM: [
    { label: "Standard   [−10, 10]", key: "STANDARD" },
    { label: "Zoom in   ×2", key: "IN" },
    { label: "Zoom out   ×½", key: "OUT" },
    { label: "Fit Y to window", key: "FIT" },
  ],
  STORE: ["A", "B", "C", "D", "M"].map((key) => ({
    label: `Ans → ${key}`,
    key: `STORE:${key}`,
  })),
  TABLE: [],
  INFO: [{ label: "Return home", key: "HOME" }],
};
function currentText(s: State) {
  return s.screen === "functions"
    ? s.functions[s.selected].expression
    : s.screen === "window"
      ? s.draft[s.selected]
      : s.entry;
}
function edit(s: State, value: string, cursor: number): State {
  s = { ...s, selectionEnd: cursor };
  if (value.length > 512)
    return { ...s, error: "Expression limited to 512 characters" };
  if (s.screen === "functions")
    return {
      ...s,
      functions: s.functions.map((f, i) =>
        i === s.selected ? { ...f, expression: value } : f,
      ),
      cursor,
      error: "",
    };
  if (s.screen === "window")
    return {
      ...s,
      draft: s.draft.map((v, i) => (i === s.selected ? value : v)),
      cursor,
      error: "",
    };
  return { ...s, entry: value, cursor, error: "", afterResult: false };
}
function screen(s: State, target: Screen): State {
  return {
    ...s,
    screen: target,
    selectionEnd: undefined,
    selected: 0,
    cursor:
      target === "functions"
        ? s.functions[0].expression.length
        : target === "window"
          ? s.draft[0].length
          : s.entry.length,
    error: "",
    second: false,
    alpha: false,
  };
}
function commitWindow(s: State): State {
  const w = { ...s.window };
  try {
    WINDOW_KEYS.forEach(
      (k, i) => (w[k] = evaluate(s.draft[i], s.angle, s.ans)),
    );
    if (!validWindow(w)) throw Error();
    return { ...s, window: w, error: "" };
  } catch {
    return { ...s, error: "Invalid window — check bounds and scales" };
  }
}
function traceSlot(s: State, direction = 0) {
  const slots = s.functions.flatMap((f, i) =>
    f.enabled && f.expression.trim() ? [i] : [],
  );
  if (!slots.length) return 0;
  const position = slots.indexOf(s.traceFunction);
  if (!direction) return position >= 0 ? s.traceFunction : slots[0];
  return position < 0
    ? direction > 0
      ? slots[0]
      : slots.at(-1)!
    : slots[(position + direction + slots.length) % slots.length];
}
function openMenu(s: State, menu: string): State {
  const menuTarget: State["menuTarget"] =
    s.screen === "home" || s.screen === "functions" || s.screen === "window"
      ? {
          screen: s.screen,
          selected: s.selected,
          cursor: s.cursor,
          selectionEnd: s.selectionEnd,
        }
      : { screen: "home", selected: 0, cursor: s.entry.length };
  return { ...screen(s, "menu"), menu, menuTarget };
}
function menuKey(s: State, key: string): State {
  if (key === "INFO") return { ...s, menu: "INFO", selected: 0 };
  if (key === "TABLE") return { ...s, menu: "TABLE", selected: 0 };
  if (key === "HISTORY") return screen(s, "history");
  if (key === "HOME") return screen(s, "home");
  if (key.startsWith("STORE:"))
    return {
      ...screen(s, "home"),
      variables: { ...s.variables, [key.slice(6)]: s.ans },
    };
  if (["STANDARD", "IN", "OUT", "FIT"].includes(key)) {
    let w =
      key === "STANDARD"
        ? { ...STANDARD }
        : zoomWindow(s.window, key === "IN" ? 0.5 : key === "OUT" ? 2 : 1);
    if (key === "FIT") {
      const values = s.functions
        .filter((f) => f.enabled && f.expression)
        .flatMap((f) => {
          try {
            const fn = compileExpression(
              f.expression,
              s.angle,
              s.ans,
              s.variables,
            );
            const values: number[] = [];
            for (let i = 0; i <= 200; i++) {
              try {
                values.push(
                  fn(
                    s.window.xmin + (s.window.xmax - s.window.xmin) * (i / 200),
                  ),
                );
              } catch {
                /* Skip undefined sample positions. */
              }
            }
            return values;
          } catch {
            return [];
          }
        });
      if (!values.length) return { ...s, error: "No defined values to fit" };
      const min = Math.min(...values),
        max = Math.max(...values),
        pad = max > min ? (max - min) * 0.1 : Math.max(Math.abs(min) * 0.1, 1);
      w = {
        ...s.window,
        ymin: min - pad,
        ymax: max + pad,
        yscl: (max - min + pad * 2) / 8,
      };
    }
    if (!validWindow(w))
      return { ...s, error: "Zoom limit reached — choose a wider window" };
    return {
      ...screen(s, "graph"),
      window: w,
      draft: WINDOW_KEYS.map((k) => String(w[k])),
    };
  }
  if (["MEAN", "SUM", "COUNT"].includes(key)) {
    if (!s.history.length) return { ...s, error: "Calculate a value first" };
    const sum = s.history.reduce((n, h) => n + h.result, 0);
    const value =
      key === "COUNT"
        ? s.history.length
        : key === "SUM"
          ? sum
          : s.history.reduce(
              (mean, h, i) => mean * (i / (i + 1)) + h.result / (i + 1),
              0,
            );
    if (!Number.isFinite(value))
      return { ...s, error: "Numeric overflow — result is too large" };
    return {
      ...screen(s, "home"),
      entry: numberText(value),
      cursor: numberText(value).length,
    };
  }
  const target = { ...s, ...s.menuTarget };
  let value = currentText(target),
    cursor = Math.max(0, Math.min(value.length, target.cursor));
  if (
    target.screen === "home" &&
    target.afterResult &&
    !value &&
    ["!", "^3"].includes(key)
  ) {
    value = "Ans";
    cursor = 3;
  }
  return edit(
    target,
    value.slice(0, cursor) +
      key +
      value.slice(Math.max(cursor, target.selectionEnd ?? cursor)),
    cursor + key.length,
  );
}
export function reducer(s: State, a: Action): State {
  if (a.type === "selection") {
    const len = currentText(s).length,
      start = Math.max(0, Math.min(len, a.start)),
      end = Math.max(start, Math.min(len, a.end));
    return s.cursor === start && s.selectionEnd === end
      ? s
      : { ...s, cursor: start, selectionEnd: end };
  }

  if (a.type === "viewport")
    return validWindow(a.window)
      ? {
          ...s,
          window: a.window,
          draft: WINDOW_KEYS.map((k) => String(a.window[k])),
          error: "",
        }
      : s;
  if (a.type === "traceAt")
    return { ...s, trace: true, traceX: a.x, traceFunction: a.index };
  if (a.type === "screen") return screen(s, a.screen);
  if (a.type === "angle") return { ...s, angle: a.angle };
  if (a.type === "toggle")
    return {
      ...s,
      functions: s.functions.map((f, i) =>
        i === a.index ? { ...f, enabled: !f.enabled } : f,
      ),
    };
  if (a.type === "select")
    return {
      ...s,
      selectionEnd: undefined,
      selected: a.index,
      cursor:
        s.screen === "functions"
          ? s.functions[a.index].expression.length
          : s.screen === "window"
            ? s.draft[a.index].length
            : 0,
    };
  if (a.type === "edit")
    return {
      ...edit(s, a.value, a.cursor),
      selectionEnd: a.selectionEnd ?? a.cursor,
    };
  if (a.type === "recall") {
    const h = s.history[a.index];
    return h
      ? {
          ...screen(s, "home"),
          entry: h.expression,
          cursor: h.expression.length,
        }
      : s;
  }
  let key = a.key;
  if (key === "ON" && !s.second) return { ...screen(s, "home"), powered: true };
  if (!s.powered) return s;
  if (key === "2ND") return { ...s, second: !s.second, alpha: false };
  if (key === "ALPHA") return { ...s, alpha: !s.alpha, second: false };
  if (s.second) {
    key = SECOND[key] ?? key;
    s = { ...s, second: false };
  } else if (s.alpha && ALPHA[key]) {
    key = ALPHA[key];
    s = { ...s, alpha: false };
  }
  if (key === "OFF") return { ...s, powered: false };
  if (key === "HOME") return screen(s, "home");
  if (key === "HISTORY") return screen(s, "history");
  if (key === "Y=") return screen(s, "functions");
  if (key === "WINDOW") return screen(s, "window");
  if (key === "MODE") return screen(s, "mode");
  if (key === "GRAPH" || key === "TRACE") {
    const next = s.screen === "window" ? commitWindow(s) : s;
    if (next.error) return next;
    return {
      ...screen(next, "graph"),
      trace: key === "TRACE",
      traceX: next.window.xmin + (next.window.xmax - next.window.xmin) / 2,
      traceFunction: traceSlot(next),
    };
  }
  if (MENUS[key]) return openMenu(s, key);
  if (key === "STO→") return openMenu(s, "STORE");
  if (key === "CLEAR")
    return ["home", "functions", "window"].includes(s.screen)
      ? edit(s, "", 0)
      : screen(s, "home");
  if (key.startsWith("Arrow")) {
    const dir = key === "ArrowUp" || key === "ArrowLeft" ? -1 : 1;
    if (s.screen === "graph")
      return key === "ArrowLeft" || key === "ArrowRight"
        ? {
            ...s,
            trace: true,
            traceFunction: traceSlot(s),
            traceX: Math.max(
              s.window.xmin,
              Math.min(
                s.window.xmax,
                s.traceX + (dir * (s.window.xmax - s.window.xmin)) / 100,
              ),
            ),
          }
        : { ...s, trace: true, traceFunction: traceSlot(s, dir) };
    if (key === "ArrowUp" || key === "ArrowDown") {
      if (s.screen === "home")
        return {
          ...screen(s, "history"),
          selected: Math.max(0, s.history.length - 1),
        };
      const count =
        s.screen === "functions"
          ? 6
          : s.screen === "window"
            ? 6
            : s.screen === "history"
              ? s.history.length
              : s.screen === "mode"
                ? 2
                : (MENUS[s.menu]?.length ?? 1);
      const selected = Math.max(0, Math.min(count - 1, s.selected + dir));
      return {
        ...s,
        selected,
        cursor:
          s.screen === "functions"
            ? s.functions[selected].expression.length
            : s.screen === "window"
              ? s.draft[selected].length
              : s.cursor,
      };
    }
    if (s.screen === "mode") return { ...s, angle: dir < 0 ? "RAD" : "DEG" };
    return {
      ...s,
      selectionEnd: undefined,
      cursor: Math.max(0, Math.min(currentText(s).length, s.cursor + dir)),
    };
  }
  if (key === "ENTER") {
    if (s.screen === "menu")
      return menuKey(s, MENUS[s.menu]?.[s.selected]?.key ?? "HOME");
    if (s.screen === "history")
      return reducer(s, { type: "recall", index: s.selected });
    if (s.screen === "mode")
      return { ...s, angle: s.angle === "RAD" ? "DEG" : "RAD" };
    if (s.screen === "functions")
      return reducer(s, { type: "select", index: (s.selected + 1) % 6 });
    if (s.screen === "window") {
      const next = commitWindow(s);
      return next.error
        ? next
        : {
            ...next,
            selected: (s.selected + 1) % 6,
            cursor: s.draft[(s.selected + 1) % 6].length,
          };
    }
    if (s.screen === "graph") return { ...s, trace: !s.trace };
    if (!s.entry.trim()) {
      const previous = s.history.at(-1);
      return previous
        ? edit(s, previous.expression, previous.expression.length)
        : s;
    }
    try {
      const result = evaluate(s.entry, s.angle, s.ans, s.variables);
      return {
        ...s,
        ans: result,
        afterResult: true,
        history: [...s.history, { expression: s.entry, result }].slice(-50),
        entry: "",
        cursor: 0,
        error: "",
      };
    } catch (error) {
      return {
        ...s,
        error: error instanceof Error ? error.message : "Calculation error",
      };
    }
  }
  if (!["home", "functions", "window"].includes(s.screen)) return s;
  const value = currentText(s);
  const end = Math.max(
    s.cursor,
    Math.min(value.length, s.selectionEnd ?? s.cursor),
  );
  if (key === "AC") return { ...edit(s, "", 0), ans: 0, afterResult: false };
  if (key === "DEL" && end > s.cursor)
    return {
      ...edit(s, value.slice(0, s.cursor) + value.slice(end), s.cursor),
      selectionEnd: s.cursor,
    };
  if (key === "DEL")
    return edit(
      s,
      value.slice(0, Math.max(0, s.cursor - 1)) + value.slice(s.cursor),
      Math.max(0, s.cursor - 1),
    );
  const inserts: Record<string, string> = {
    "x²": "^2",
    "x⁻¹": "^(-1)",
    "√": "sqrt(",
    SIN: "sin(",
    COS: "cos(",
    TAN: "tan(",
    LOG: "log(",
    LN: "ln(",
    "(−)": "-",
    "X,T,θ,n": "x",
    EE: "e",
    ANS: "Ans",
    "×": "*",
    "÷": "/",
    "−": "-",
  };
  const insert = inserts[key] ?? key;
  if (
    s.screen === "home" &&
    s.afterResult &&
    !value &&
    ["+", "-", "*", "/", "^", "^2", "^(-1)", "!", "%"].includes(insert) &&
    key !== "(−)"
  )
    return edit(s, "Ans" + insert, 3 + insert.length);
  return edit(
    s,
    value.slice(0, s.cursor) + insert + value.slice(end),
    s.cursor + insert.length,
  );
}
export const SECOND: Record<string, string> = {
  MODE: "HOME",
  ON: "OFF",
  SIN: "asin(",
  COS: "acos(",
  TAN: "atan(",
  "x²": "sqrt(",
  LOG: "10^(",
  LN: "exp(",
  "(−)": "Ans",
  "^": "pi",
  DEL: "HISTORY",
  "Y=": "TABLE",
  TRACE: "HISTORY",
  ",": "EE",
};
export const ALPHA: Record<string, string> = {
  MATH: "A",
  APPS: "B",
  PRGM: "C",
  VARS: "D",
  "^": "M",
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isFunctionSlot(value: unknown): value is FunctionSlot {
  return (
    isRecord(value) &&
    typeof value.expression === "string" &&
    value.expression.length <= 512 &&
    typeof value.enabled === "boolean"
  );
}
function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    isRecord(value) &&
    typeof value.expression === "string" &&
    value.expression.length <= 512 &&
    typeof value.result === "number" &&
    Number.isFinite(value.result)
  );
}
export function restoreState(): State {
  try {
    const raw = localStorage.getItem("graphite84:v1");
    if (!raw || raw.length > 200000) return initialState;
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved)) return initialState;
    const window = validWindow(saved.window) ? saved.window : { ...STANDARD };
    const variables: Record<string, number> = {};
    if (isRecord(saved.variables))
      for (const [name, value] of Object.entries(saved.variables)) {
        if (
          ["A", "B", "C", "D", "M"].includes(name) &&
          typeof value === "number" &&
          Number.isFinite(value)
        )
          variables[name] = value;
      }
    return {
      ...initialState,
      angle: saved.angle === "DEG" ? "DEG" : "RAD",
      window,
      draft: WINDOW_KEYS.map((k) => String(window[k])),
      functions:
        Array.isArray(saved.functions) &&
        saved.functions.length === 6 &&
        saved.functions.every(isFunctionSlot)
          ? saved.functions
          : initialState.functions,
      history: Array.isArray(saved.history)
        ? saved.history.slice(-50).filter(isHistoryEntry)
        : [],
      ans:
        typeof saved.ans === "number" && Number.isFinite(saved.ans)
          ? saved.ans
          : 0,
      variables,
    };
  } catch {
    return initialState;
  }
}
