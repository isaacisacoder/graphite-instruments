import { useId } from "react";
export const KEY_STYLES = [
  "graphite",
  "classic",
  "onyx",
  "precision",
  "soft-touch",
  "blush",
  "sage",
  "lavender-mint",
  "retro-typewriter",
  "porcelain",
  "stone",
  "amber",
  "clear-ice",
  "clear-lilac",
  "clear-mint",
] as const;
export type KeyStyle = (typeof KEY_STYLES)[number];
const labels: Record<KeyStyle, string> = {
  graphite: "Graphite",
  classic: "Classic",
  onyx: "Onyx",
  precision: "Precision",
  "soft-touch": "Soft Touch",
  blush: "Blush Pink",
  sage: "Matcha Sage",
  "lavender-mint": "Lavender Mint",
  "retro-typewriter": "Retro Typewriter",
  porcelain: "Porcelain",
  stone: "Warm Stone",
  amber: "Dark Amber",
  "clear-ice": "Clear Ice",
  "clear-lilac": "Clear Lilac",
  "clear-mint": "Clear Mint",
};
const groups: { label: string; styles: readonly KeyStyle[] }[] = [
  { label: "Original", styles: KEY_STYLES.slice(0, 5) },
  { label: "Pastel", styles: ["blush", "sage", "lavender-mint"] },
  { label: "Retro", styles: ["retro-typewriter"] },
  { label: "Minimal", styles: ["porcelain", "stone"] },
  { label: "Dark", styles: ["amber"] },
  { label: "Clear shell", styles: ["clear-ice", "clear-lilac", "clear-mint"] },
];
export function shellStyle(style: KeyStyle) {
  return style.startsWith("clear-")
    ? "clear"
    : [
          "blush",
          "sage",
          "lavender-mint",
          "retro-typewriter",
          "porcelain",
          "stone",
        ].includes(style)
      ? "light"
      : undefined;
}
export function readKeyStyle(): KeyStyle {
  try {
    const saved = localStorage.getItem("graphite84:key-style");
    return KEY_STYLES.find((style) => style === saved) ?? "graphite";
  } catch {
    return "graphite";
  }
}
export default function KeyStylePicker({
  value,
  onChange,
}: {
  value: KeyStyle;
  onChange: (value: KeyStyle) => void;
}) {
  const id = useId();
  return (
    <div className="key-style-control">
      <label htmlFor={id}>Style</label>
      <select
        id={id}
        aria-label="Key style"
        value={value}
        onChange={(event) => {
          const selected = KEY_STYLES.find(
            (style) => style === event.target.value,
          );
          if (selected) onChange(selected);
        }}
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.styles.map((style) => (
              <option key={style} value={style}>
                {labels[style]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
