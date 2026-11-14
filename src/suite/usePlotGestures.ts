import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import {
  gestureWindow,
  validWindow,
  type GraphWindow,
  type Point,
} from "../plot";
export function usePlotGestures(
  svg: RefObject<SVGSVGElement | null>,
  window: GraphWindow,
  update: (w: GraphWindow) => void,
  tap: (p: Point) => void,
) {
  const current = useRef({ window, update, tap });
  current.current = { window, update, tap };
  const pointers = useRef(new Map<number, Point>()),
    gesture = useRef<{
      w: GraphWindow;
      points: Point[];
      moved: boolean;
    } | null>(null);
  const position = (x: number, y: number): Point => {
    const r = svg.current!.getBoundingClientRect();
    return [(x - r.left) / r.width, (y - r.top) / r.height];
  };
  const center = (p: Point[]): Point =>
    p.length === 1 ? p[0] : [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
  const frame = useRef(0),
    pending = useRef<GraphWindow | null>(null);
  const flush = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (pending.current) {
      current.current.update(pending.current);
      pending.current = null;
    }
  };
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  const set = (w: GraphWindow) => {
    if (validWindow(w)) {
      pending.current = w;
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    }
  };
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = position(e.clientX, e.clientY);
      set(
        gestureWindow(
          pending.current ?? current.current.window,
          p,
          p,
          Math.exp(
            Math.max(
              -0.5,
              Math.min(
                0.5,
                e.deltaY *
                  (e.deltaMode === 1
                    ? 16
                    : e.deltaMode === 2
                      ? el.clientHeight
                      : 1) *
                  0.002,
              ),
            ),
          ),
        ),
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [svg]);
  const begin = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, position(e.clientX, e.clientY));
    gesture.current = {
      w: current.current.window,
      points: [...pointers.current.values()].slice(0, 2),
      moved: pointers.current.size > 1,
    };
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, position(e.clientX, e.clientY));
    const p = [...pointers.current.values()].slice(0, 2),
      a = center(g.points),
      b = center(p);
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.008) g.moved = true;
    if (!g.moved) return;
    const r = svg.current!.getBoundingClientRect();
    const distance = (v: Point[]) =>
      Math.hypot((v[0][0] - v[1][0]) * r.width, (v[0][1] - v[1][1]) * r.height);
    set(
      gestureWindow(
        g.w,
        a,
        b,
        p.length === 2 && g.points.length === 2
          ? distance(g.points) / Math.max(8, distance(p))
          : 1,
      ),
    );
  };
  const end = (e: PointerEvent<SVGSVGElement>) => {
    flush();
    const g = gesture.current;
    if (!pointers.current.has(e.pointerId)) return;
    if (g && !g.moved && e.type === "pointerup") {
      const [x, y] = position(e.clientX, e.clientY),
        w = current.current.window;
      current.current.tap([
        w.xmin + x * (w.xmax - w.xmin),
        w.ymax - y * (w.ymax - w.ymin),
      ]);
    }
    pointers.current.delete(e.pointerId);
    gesture.current = pointers.current.size
      ? {
          w: current.current.window,
          points: [...pointers.current.values()],
          moved: true,
        }
      : null;
  };
  return {
    onPointerDown: begin,
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  };
}
