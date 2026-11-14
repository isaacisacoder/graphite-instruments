import { initialState, type HistoryEntry, type State } from "../state";
export function restoreLite(raw: string | null): State {
  const fresh = { ...initialState, history: [], variables: {} };
  if (!raw || raw.length > 40000) return fresh;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    if (raw.trim().startsWith("{")) return fresh;
    return {
      ...fresh,
      entry: raw.slice(0, 512),
      cursor: Math.min(raw.length, 512),
    };
  }
  if (typeof saved !== "object" || saved === null || Array.isArray(saved))
    return {
      ...fresh,
      entry: raw.slice(0, 512),
      cursor: Math.min(raw.length, 512),
    };
  const p = saved as Record<string, unknown>,
    entry = typeof p.entry === "string" ? p.entry.slice(0, 512) : "";
  const history: HistoryEntry[] = Array.isArray(p.history)
    ? p.history
        .slice(-50)
        .filter(
          (h: unknown): h is HistoryEntry =>
            typeof h === "object" &&
            h !== null &&
            typeof (h as HistoryEntry).expression === "string" &&
            (h as HistoryEntry).expression.length <= 512 &&
            typeof (h as HistoryEntry).result === "number" &&
            Number.isFinite((h as HistoryEntry).result),
        )
    : [];
  return {
    ...fresh,
    entry,
    cursor: entry.length,
    history,
    ans:
      typeof p.ans === "number" && Number.isFinite(p.ans)
        ? p.ans
        : (history.at(-1)?.result ?? 0),
    angle: p.angle === "DEG" ? "DEG" : "RAD",
    afterResult: p.afterResult === true && !entry && history.length > 0,
  };
}
