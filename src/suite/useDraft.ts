import { useUndo } from "../useUndo";
import { usePersist } from "../usePersist";
export function useDraft(key: string, initial: Record<string, string>) {
  const history = useUndo<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(`graphite:suite:${key}`);
      if (!raw || raw.length > 20000) return initial;
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      )
        return initial;
      const stored = parsed as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(initial).map(([name, value]) => [
          name,
          typeof stored[name] === "string" &&
          (stored[name] as string).length <= 5000
            ? stored[name]
            : value,
        ]),
      ) as Record<string, string>;
    } catch {
      return initial;
    }
  });
  const fields = history.state,
    setFields = history.set;
  usePersist(`graphite:suite:${key}`, fields);
  return [fields, setFields, history] as const;
}
