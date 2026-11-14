import { useId } from "react";
export const BACKGROUNDS = [
  { id: "paper", name: "Plain paper", dark: false },
  { id: "charcoal", name: "Charcoal", dark: true },
  { id: "graph-paper", name: "Graph paper", dark: false },
  { id: "geometry", name: "Geometry notes", dark: false },
  { id: "blueprint", name: "Blueprint", dark: true },
  { id: "chalkboard", name: "Chalkboard", dark: true },
  { id: "constellations", name: "Constellations", dark: true },
  { id: "signal-lab", name: "Signal lab", dark: false },
  { id: "contours", name: "Contour atlas", dark: false },
] as const;
export type Background = (typeof BACKGROUNDS)[number]["id"];
export function readBackground(): Background {
  try {
    const saved = localStorage.getItem("graphite84:background");
    return BACKGROUNDS.find((theme) => theme.id === saved)?.id ?? "paper";
  } catch {
    return "paper";
  }
}
export default function BackgroundPicker({
  value,
  onChange,
}: {
  value: Background;
  onChange: (value: Background) => void;
}) {
  const id = useId();
  return (
    <div className="background-control">
      <label htmlFor={id}>Backdrop</label>
      <select
        id={id}
        aria-label="Background theme"
        value={value}
        onChange={(e) => {
          const theme = BACKGROUNDS.find(
            (theme) => theme.id === e.target.value,
          );
          if (theme) onChange(theme.id);
        }}
      >
        {BACKGROUNDS.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
}
