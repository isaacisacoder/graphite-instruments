import { describe, it, expect, beforeEach } from "vitest";
import { keyboardKey, readKeyboardMode } from "./keyboard";
const key = (key: string, extra: KeyboardEventInit = {}, chromebook = false) =>
  keyboardKey(
    new KeyboardEvent("keydown", { key, ...extra }),
    "ti84",
    chromebook,
  );
describe("TI primary keyboard mapping", () => {
  it.each([
    ["a", "MATH"],
    ["b", "APPS"],
    ["c", "PRGM"],
    ["d", "x⁻¹"],
    ["e", "SIN"],
    ["f", "COS"],
    ["g", "TAN"],
    ["h", "^"],
    ["i", "x²"],
    ["j", ","],
    ["k", "("],
    ["l", ")"],
    ["m", "÷"],
    ["n", "LOG"],
    ["o", "7"],
    ["p", "8"],
    ["q", "9"],
    ["r", "×"],
    ["s", "LN"],
    ["t", "4"],
    ["u", "5"],
    ["v", "6"],
    ["w", "−"],
    ["x", "STO→"],
    ["y", "1"],
    ["z", "2"],
  ])("%s activates %s", (input, expected) => expect(key(input)).toBe(expected));
  it.each([
    ["F1", "Y="],
    ["F2", "WINDOW"],
    ["F3", "ZOOM"],
    ["F4", "TRACE"],
    ["F5", "GRAPH"],
    ["F6", "2ND"],
    ["F7", "ALPHA"],
    ["Backspace", "CLEAR"],
    ["Delete", "DEL"],
    ["Enter", "ENTER"],
    ["ArrowLeft", "ArrowLeft"],
    ["ArrowRight", "ArrowRight"],
    ["ArrowUp", "ArrowUp"],
    ["ArrowDown", "ArrowDown"],
    ["0", "0"],
    ["3", "3"],
    ["9", "9"],
    ["^", "^"],
    ["*", "×"],
    ["/", "÷"],
    ["-", "−"],
    ["+", "+"],
    [",", ","],
    ["(", "("],
    [")", ")"],
    [".", "."],
    [":", "."],
    ["?", "(−)"],
    ["_", "(−)"],
    ["~", "ON"],
  ])("%s activates %s", (input, expected) => expect(key(input)).toBe(expected));
  it.each([
    ["M", "KeyM", "MODE"],
    ["X", "KeyX", "X,T,θ,n"],
    ["S", "KeyS", "STAT"],
    ["V", "KeyV", "VARS"],
    ["^", "Digit6", "^"],
    ["*", "Digit8", "×"],
    ["(", "Digit9", "("],
    [")", "Digit0", ")"],
    ["+", "Equal", "+"],
    ["~", "Backquote", "ON"],
    [":", "Semicolon", "."],
    [">", "Period", "."],
    ["_", "Minus", "(−)"],
    ["?", "Slash", "(−)"],
  ])("shifted %s activates %s", (input, code, expected) =>
    expect(key(input, { shiftKey: true, code })).toBe(expected),
  );
  it("handles Caps Lock independently of Shift", () =>
    expect(key("M")).toBe("÷"));
  it.each([1, 2, 3, 4, 5, 6, 7])("handles Chromebook Search + %s", (n) =>
    expect(key(String(n), { metaKey: true }, true)).toBe(
      ["Y=", "WINDOW", "ZOOM", "TRACE", "GRAPH", "2ND", "ALPHA"][n - 1],
    ),
  );
  it("handles Chromebook delete without stealing Mac command shortcuts", () => {
    expect(key("Backspace", { metaKey: true }, true)).toBe("DEL");
    expect(key("Backspace", { metaKey: true })).toBeUndefined();
    expect(key("1", { metaKey: true })).toBeUndefined();
  });
  it("leaves system shortcuts and text composition alone", () => {
    expect(key("a", { ctrlKey: true })).toBeUndefined();
    expect(key("a", { altKey: true })).toBeUndefined();
    expect(key("a", { isComposing: true })).toBeUndefined();
  });
});
describe("typing preference", () => {
  beforeEach(() => localStorage.clear());
  it("retains literal letters and conventional editing in typing mode", () => {
    expect(
      keyboardKey(new KeyboardEvent("keydown", { key: "e" }), "typing"),
    ).toBe("e");
    expect(
      keyboardKey(new KeyboardEvent("keydown", { key: "Backspace" }), "typing"),
    ).toBe("DEL");
  });
  it("defaults to TI-84 and validates persisted preferences", () => {
    expect(readKeyboardMode()).toBe("ti84");
    localStorage.setItem("graphite84:keyboard", "typing");
    expect(readKeyboardMode()).toBe("typing");
    localStorage.setItem("graphite84:keyboard", "invalid");
    expect(readKeyboardMode()).toBe("ti84");
  });
});
