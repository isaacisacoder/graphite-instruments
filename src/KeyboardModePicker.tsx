import type { KeyboardMode } from "./keyboard";
export default function KeyboardModePicker({
  value,
  onChange,
}: {
  value: KeyboardMode;
  onChange: (value: KeyboardMode) => void;
}) {
  return (
    <div className="key-style-control mapping-control">
      <label htmlFor="keyboard-mode">Keyboard</label>
      <select
        id="keyboard-mode"
        value={value}
        onChange={(e) =>
          onChange(e.target.value === "typing" ? "typing" : "ti84")
        }
      >
        <option value="ti84">TI-84</option>
        <option value="typing">Typing</option>
      </select>
    </div>
  );
}
