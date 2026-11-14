import { ALPHA, SECOND } from "./state";
import HardwareButton, { type HardwareActions } from "./HardwareButton";
interface Key {
  label: string;
  key?: string;
  legend?: string;
  className?: string;
}
const rows: Key[][] = [
  [
    { label: "MATH" },
    { label: "APPS" },
    { label: "PRGM" },
    { label: "VARS" },
    { label: "CLEAR" },
  ],
  [
    { label: "x⁻¹" },
    { label: "sin", key: "SIN" },
    { label: "cos", key: "COS" },
    { label: "tan", key: "TAN" },
    { label: "^" },
  ],
  [
    { label: "x²" },
    { label: ",", key: ",", legend: "EE" },
    { label: "(" },
    { label: ")" },
    { label: "÷", className: "operator" },
  ],
  [
    { label: "log", key: "LOG" },
    { label: "7", className: "number" },
    { label: "8", className: "number" },
    { label: "9", className: "number" },
    { label: "×", className: "operator" },
  ],
  [
    { label: "ln", key: "LN" },
    { label: "4", className: "number" },
    { label: "5", className: "number" },
    { label: "6", className: "number" },
    { label: "−", className: "operator" },
  ],
  [
    { label: "sto→", key: "STO→" },
    { label: "1", className: "number" },
    { label: "2", className: "number" },
    { label: "3", className: "number" },
    { label: "+", className: "operator" },
  ],
  [
    { label: "on", key: "ON" },
    { label: "0", className: "number" },
    { label: ".", className: "number" },
    { label: "(−)", className: "number" },
    { label: "enter", key: "ENTER", className: "enter" },
  ],
];
const legendText: Record<string, string> = {
  MODE: "quit",
  ON: "off",
  SIN: "sin⁻¹",
  COS: "cos⁻¹",
  TAN: "tan⁻¹",
  "x²": "√",
  LOG: "10ˣ",
  LN: "eˣ",
  "(−)": "ans",
  "^": "π",
  DEL: "history",
  "Y=": "table",
  TRACE: "history",
};
export function KeyButton({
  item,
  press,
  release,
  active = false,
}: {
  item: Key;
  press: HardwareActions["press"];
  release: HardwareActions["release"];
  active?: boolean;
}) {
  const key = item.key ?? item.label;
  return (
    <div className={`key-wrap ${item.className ?? ""}`}>
      <div className="key-legend">
        <span>{item.legend ?? (SECOND[key] ? legendText[key] : "")}</span>
        <i>{ALPHA[key] ?? ""}</i>
      </div>
      <HardwareButton
        type="button"
        className={`key ${item.className ?? ""} ${active ? "is-active" : ""}`}
        keyCode={key}
        press={press}
        release={release}
        aria-label={key}
        aria-pressed={key === "2ND" || key === "ALPHA" ? active : undefined}
      >
        {item.label}
      </HardwareButton>
    </div>
  );
}
export default function Keypad({
  press,
  release,
  second,
  alpha,
}: {
  press: HardwareActions["press"];
  release: HardwareActions["release"];
  second: boolean;
  alpha: boolean;
}) {
  return (
    <>
      <div className="graph-keys">
        {["Y=", "WINDOW", "ZOOM", "TRACE", "GRAPH"].map((label) => (
          <KeyButton
            key={label}
            item={{
              label: label.toLowerCase(),
              key: label,
              className: "graph-key",
            }}
            press={press}
            release={release}
          />
        ))}
      </div>
      <div className="navigation">
        <div className="mode-keys">
          <KeyButton
            item={{ label: "2nd", key: "2ND", className: "second" }}
            press={press}
            release={release}
            active={second}
          />
          <KeyButton
            item={{ label: "mode", key: "MODE" }}
            press={press}
            release={release}
          />
          <KeyButton
            item={{ label: "del", key: "DEL" }}
            press={press}
            release={release}
          />
          <KeyButton
            item={{ label: "alpha", key: "ALPHA", className: "alpha" }}
            press={press}
            release={release}
            active={alpha}
          />
          <KeyButton
            item={{ label: "X,T,θ,n" }}
            press={press}
            release={release}
          />
          <KeyButton
            item={{ label: "stat", key: "STAT" }}
            press={press}
            release={release}
          />
        </div>
        <div className="dpad" aria-label="Directional controls">
          <div className="rocker-face">
            <span className="rocker-cap" aria-hidden="true" />
            {[
              ["↑", "ArrowUp", "up"],
              ["←", "ArrowLeft", "left"],
              ["→", "ArrowRight", "right"],
              ["↓", "ArrowDown", "down"],
            ].map(([label, key, cls]) => (
              <HardwareButton
                key={key}
                className={cls}
                aria-label={key}
                keyCode={key}
                press={press}
                release={release}
              >
                {label}
              </HardwareButton>
            ))}
            <span className="rocker-hub" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="main-keys">
        {rows.flat().map((item) => (
          <KeyButton
            key={item.key ?? item.label}
            item={item}
            press={press}
            release={release}
          />
        ))}
      </div>
    </>
  );
}
