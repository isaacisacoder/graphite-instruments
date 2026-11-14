import {
  useLayoutEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { parse } from "mathjs/number";
import katex from "katex";
import { compileExpression, type Angle } from "./math";
export function MathPreview({
  value,
  angle = "RAD",
  variables = {},
}: {
  value: string;
  angle?: Angle;
  variables?: Record<string, number>;
}) {
  const names = Object.keys(variables).sort().join(",");
  const html = useMemo(() => {
    try {
      if (!value.trim()) return "";
      compileExpression(
        value,
        angle,
        0,
        Object.fromEntries(
          names
            .split(",")
            .filter(Boolean)
            .map((n) => [n, 0]),
        ),
      );
      return katex.renderToString(parse(value.replaceAll("π", "pi")).toTex(), {
        trust: false,
        throwOnError: false,
        output: "mathml",
        maxExpand: 100,
        maxSize: 10,
      });
    } catch {
      return "";
    }
  }, [value, angle, names]);
  return html ? (
    <span className="math-preview" dangerouslySetInnerHTML={{ __html: html }} />
  ) : null;
}
export default function MathInput({
  value,
  onChange,
  label,
  maxLength = 240,
  variables = {},
  angle = "RAD",
}: {
  value: string;
  onChange: (value: string, start: number, end: number) => void;
  label: string;
  maxLength?: number;
  variables?: Record<string, number>;
  angle?: Angle;
}) {
  const input = useRef<HTMLInputElement>(null),
    selection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    if (selection.current && input.current) {
      input.current.setSelectionRange(...selection.current);
      selection.current = null;
    }
  }, [value]);
  const replace = (before: string, after: string) => {
    const el = input.current;
    if (!el) return;
    const a = el.selectionStart ?? value.length,
      b = el.selectionEnd ?? a,
      chosen = value.slice(a, b);
    let insertion = before + chosen + after,
      start = a + before.length,
      end = start + chosen.length;
    if (before === "^2") {
      insertion = chosen ? `(${chosen})^2` : "^2";
      start = end = a + insertion.length;
    } else if (before === "fraction") {
      insertion = chosen ? `(${chosen})/()` : `()/()`;
      start = end = a + (chosen ? chosen.length + 4 : 1);
    }
    const next = value.slice(0, a) + insertion + value.slice(b);
    if (next.length > maxLength) return;
    selection.current = [start, end];
    onChange(next, start, end);
    el.focus();
  };
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "(") {
      e.preventDefault();
      replace("(", ")");
    } else if (
      e.key === ")" &&
      value[e.currentTarget.selectionStart ?? -1] === ")"
    ) {
      e.preventDefault();
      const n = (e.currentTarget.selectionStart ?? 0) + 1;
      e.currentTarget.setSelectionRange(n, n);
    }
  };
  return (
    <div className="math-entry">
      <input
        ref={input}
        aria-label={label}
        value={value}
        maxLength={maxLength}
        spellCheck={false}
        autoCapitalize="off"
        onKeyDown={keys}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(
            e.target.value,
            e.target.selectionStart ?? e.target.value.length,
            e.target.selectionEnd ?? e.target.value.length,
          )
        }
      />
      <div className="math-entry-tools">
        <select
          aria-label={`${label} template`}
          value=""
          onChange={(e) => {
            if (e.target.value)
              replace(e.target.value, e.target.value === "^2" ? "" : ")");
          }}
        >
          <option value="">Insert…</option>
          <option value="sin(">sin</option>
          <option value="cos(">cos</option>
          <option value="sqrt(">Square root</option>
          <option value="ln(">ln</option>
          <option value="(">Parentheses</option>
          <option value="^2">Square</option>
          <option value="fraction">Fraction</option>
        </select>
        <MathPreview value={value} angle={angle} variables={variables} />
      </div>
    </div>
  );
}
