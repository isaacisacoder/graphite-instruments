import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
export type Commit<T> = (update: SetStateAction<T>, group?: string) => void;
export function useUndo<T>(
  initial: () => T,
  active = true,
  shouldRecord?: (previous: T, next: T) => boolean,
) {
  const [state, render] = useState(initial),
    value = useRef(state),
    past = useRef<T[]>([]),
    future = useRef<T[]>([]),
    last = useRef({ group: "", time: 0 });
  const filter = useRef(shouldRecord);
  filter.current = shouldRecord;
  const set = useCallback<Commit<T>>((update, group) => {
    const next =
      typeof update === "function"
        ? (update as (v: T) => T)(value.current)
        : update;
    if (next === value.current) return;
    if (filter.current && !filter.current(value.current, next)) {
      value.current = next;
      render(next);
      return;
    }
    const now = Date.now();
    if (!group || last.current.group !== group || now - last.current.time > 650)
      past.current = [...past.current, value.current].slice(-100);
    last.current = { group: group ?? "", time: now };
    future.current = [];
    value.current = next;
    render(next);
  }, []);
  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (previous === undefined) return;
    future.current.push(value.current);
    value.current = previous;
    last.current.group = "";
    render(previous);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(value.current);
    value.current = next;
    last.current.group = "";
    render(next);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!active) return;
      if (
        !(e.ctrlKey || e.metaKey) ||
        e.altKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        (e.shiftKey ? redo : undo)();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, redo, active]);
  const replace = useCallback((update: SetStateAction<T>) => {
    const next =
      typeof update === "function"
        ? (update as (v: T) => T)(value.current)
        : update;
    value.current = next;
    render(next);
  }, []);
  return {
    state,
    set,
    replace,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
