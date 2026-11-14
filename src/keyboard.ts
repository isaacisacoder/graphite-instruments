export type KeyboardMode = "ti84" | "typing";
export const TI_LETTERS: Record<string, string> = {
  a: "MATH",
  b: "APPS",
  c: "PRGM",
  d: "x⁻¹",
  e: "SIN",
  f: "COS",
  g: "TAN",
  h: "^",
  i: "x²",
  j: ",",
  k: "(",
  l: ")",
  m: "÷",
  n: "LOG",
  o: "7",
  p: "8",
  q: "9",
  r: "×",
  s: "LN",
  t: "4",
  u: "5",
  v: "6",
  w: "−",
  x: "STO→",
  y: "1",
  z: "2",
};
const shared: Record<string, string> = {
  Enter: "ENTER",
  Delete: "DEL",
  Escape: "CLEAR",
  F1: "Y=",
  F2: "WINDOW",
  F3: "ZOOM",
  F4: "TRACE",
  F5: "GRAPH",
  F6: "2ND",
  F7: "ALPHA",
  Home: "HOME",
  PageUp: "HISTORY",
};
export function readKeyboardMode(): KeyboardMode {
  try {
    return localStorage.getItem("graphite84:keyboard") === "typing"
      ? "typing"
      : "ti84";
  } catch {
    return "ti84";
  }
}
/** Match logical keys, then shifted physical punctuation across keyboard layouts. */
export function keyboardKey(
  e: KeyboardEvent,
  mode: KeyboardMode = "typing",
  chromebook = typeof navigator !== "undefined" &&
    /CrOS/.test(navigator.userAgent),
): string | undefined {
  if (e.isComposing || e.ctrlKey || e.altKey) return;
  if (e.metaKey) {
    // ChromeOS Search combinations arrive as Meta when the OS forwards them.
    if (mode === "ti84" && chromebook && e.key === "Backspace") return "DEL";
    if (mode === "ti84" && chromebook && /^[1-7]$/.test(e.key))
      return shared[`F${e.key}`];
    return;
  }
  if (shared[e.key]) return shared[e.key];
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
    return e.key;
  if (mode === "typing") {
    if (e.key === "Backspace") return "DEL";
    if (/^[0-9a-zA-Z.+\-*/^()!,%]$/.test(e.key))
      return e.key === "X" ? "x" : e.key;
    return;
  }
  if (e.key === "Backspace") return "CLEAR";
  const lower = e.key.toLowerCase();
  if (e.shiftKey) {
    const shifted: Record<string, string> = {
      m: "MODE",
      x: "X,T,θ,n",
      s: "STAT",
      v: "VARS",
    };
    if (shifted[lower]) return shifted[lower];
    const codes: Record<string, string> = {
      Digit6: "^",
      Digit8: "×",
      Digit9: "(",
      Digit0: ")",
      Equal: "+",
      Backquote: "ON",
      Period: ".",
      Semicolon: ".",
      Minus: "(−)",
      Slash: "(−)",
    };
    if (codes[e.code]) return codes[e.code];
  }
  if (TI_LETTERS[lower]) return TI_LETTERS[lower];
  const symbols: Record<string, string> = {
    "^": "^",
    "*": "×",
    "/": "÷",
    "-": "−",
    "+": "+",
    "(": "(",
    ")": ")",
    ",": ",",
    ".": ".",
    ">": ".",
    ":": ".",
    "~": "ON",
    _: "(−)",
    "?": "(−)",
  };
  if (symbols[e.key]) return symbols[e.key];
  if (/^[0-9]$/.test(e.key)) return e.key;
}
export const KEYBOARD_REFERENCE = [
  ["Y= / WINDOW / ZOOM / TRACE / GRAPH", "F1–F5", "Search + 1–5"],
  ["2nd / ALPHA", "F6 / F7", "Search + 6 / 7"],
  ["Arrows", "Arrow keys", "Arrow keys"],
  ["MODE / X,T,θ,n", "Shift + M / Shift + X", "Same"],
  ["STAT / VARS", "Shift + S / Shift + V", "Same"],
  ["DEL", "Delete · Mac: Fn + Backspace", "Search + Backspace"],
  ["CLEAR", "Backspace", "Backspace"],
  ["MATH / APPS / PRGM", "A / B / C", "Same"],
  ["x⁻¹ / SIN / COS / TAN", "D / E / F / G", "Same"],
  ["Power / square", "H or ^ / I", "Same"],
  ["Comma / ( / )", "J or , / K or ( / L or )", "Same"],
  ["Divide / LOG / LN", "M or / / N / S", "Same"],
  ["7 / 8 / 9", "O / P / Q, or digits", "Same"],
  ["4 / 5 / 6", "T / U / V, or digits", "Same"],
  ["1 / 2 / 3", "Y / Z / 3, or digits", "Same"],
  ["Multiply / subtract", "R or * / W or −", "Same"],
  ["STO→ / plus", "X / Shift + =", "Same"],
  ["ON", "Shift + `", "Same"],
  ["0 / decimal", "0 / . or Shift + :", "Same"],
  ["Negative (−)", "Shift + − or ?", "Same"],
  ["ENTER", "Enter", "Enter"],
] as const;
