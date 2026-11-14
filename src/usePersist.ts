import { useEffect, useRef } from "react";
export function usePersist(key: string, value: unknown) {
  const latest = useRef(value);
  latest.current = value;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(latest.current));
      } catch {
        /* Storage may be unavailable. */
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [key, value]);
  useEffect(() => {
    const flush = () => {
      clearTimeout(timer.current);
      try {
        localStorage.setItem(key, JSON.stringify(latest.current));
      } catch {
        /* Optional persistence. */
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [key]);
}
