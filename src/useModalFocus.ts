import { useEffect, type RefObject } from "react";
export function useModalFocus(
  open: boolean,
  root: RefObject<HTMLElement | null>,
  close: () => void,
) {
  useEffect(() => {
    const el = root.current;
    if (!open || !el) return;
    const previous = document.activeElement as HTMLElement | null,
      changed = new Map<HTMLElement, boolean>();
    let node: HTMLElement | null = el;
    while (node?.parentElement && node !== document.body) {
      for (const sibling of node.parentElement.children)
        if (sibling !== node && sibling instanceof HTMLElement) {
          changed.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      node = node.parentElement;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const items = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]',
        ),
      ).filter(
        (n) => n.getClientRects().length && !n.closest("[hidden],[inert]"),
      );
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
      if (e.key === "Tab") {
        const list = items(),
          first = list[0],
          last = list.at(-1);
        if (!first) {
          e.preventDefault();
          el.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first ||
            !el.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !el.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", key);
    items()[0]?.focus();
    return () => {
      el.removeEventListener("keydown", key);
      for (const [n, value] of changed) n.inert = value;
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, root, close]);
}
