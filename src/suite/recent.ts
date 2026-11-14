import { INSTRUMENTS, type Instrument } from "./catalog";
export interface RecentState {
  favorites: Instrument[];
  recent: Instrument[];
  last: string;
}
export function readRecent(): RecentState {
  try {
    const r = JSON.parse(localStorage.getItem("graphite:recent") ?? "null");
    const valid = (v: unknown): v is Instrument =>
      INSTRUMENTS.some((i) => i.id === v);
    return {
      favorites: Array.isArray(r?.favorites) ? r.favorites.filter(valid) : [],
      recent: Array.isArray(r?.recent)
        ? r.recent.filter(valid).slice(0, 9)
        : [],
      last:
        typeof r?.last === "string" &&
        /^#\/(basic|scientific|graphing|financial|cas|calculus|statistics|matrix|discrete|surface|plot)$/.test(
          r.last,
        )
          ? r.last
          : "",
    };
  } catch {
    return { favorites: [], recent: [], last: "" };
  }
}
