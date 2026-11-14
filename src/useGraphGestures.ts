import { useEffect, useRef, type Dispatch, type PointerEvent } from "react";
import type { Action, State } from "./state";
import { compileExpression } from "./math";
import { gestureWindow, type GraphWindow, type Point } from "./plot";

interface Gesture {
  window: GraphWindow;
  points: Point[];
  moved: boolean;
}
const midpoint = (points: Point[]): Point =>
  points.length === 1
    ? points[0]
    : [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
const distance = (points: Point[]) =>
  Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]);
export function useGraphGestures(state: State, dispatch: Dispatch<Action>) {
  const svg = useRef<SVGSVGElement>(null);
  const current = useRef(state);
  current.current = state;
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const position = (clientX: number, clientY: number): Point => {
    const rect = svg.current!.getBoundingClientRect();
    return [
      (clientX - rect.left) / rect.width,
      (clientY - rect.top) / rect.height,
    ];
  };
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = position(event.clientX, event.clientY),
        factor = Math.exp(
          Math.max(
            -0.5,
            Math.min(
              0.5,
              event.deltaY *
                (event.deltaMode === 1
                  ? 16
                  : event.deltaMode === 2
                    ? element.clientHeight
                    : 1) *
                0.002,
            ),
          ),
        );
      dispatch({
        type: "viewport",
        window: gestureWindow(current.current.window, point, point, factor),
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [dispatch]);
  const begin = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, position(e.clientX, e.clientY));
    gesture.current = {
      window: current.current.window,
      points: [...pointers.current.values()].slice(0, 2),
      moved: pointers.current.size > 1,
    };
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, position(e.clientX, e.clientY));
    const points = [...pointers.current.values()].slice(0, 2),
      start = gesture.current;
    const from = midpoint(start.points),
      to = midpoint(points);
    if (Math.hypot(from[0] - to[0], from[1] - to[1]) > 0.012)
      start.moved = true;
    if (!start.moved) return;
    const rect = svg.current!.getBoundingClientRect();
    // Measure pinch distances in pixels so a rectangular display does not distort scale.
    const pixels = (values: Point[]) =>
      values.map(([x, y]): Point => [x * rect.width, y * rect.height]);
    const factor =
      points.length === 2 && start.points.length === 2
        ? distance(pixels(start.points)) / Math.max(8, distance(pixels(points)))
        : 1;
    dispatch({
      type: "viewport",
      window: gestureWindow(start.window, from, to, factor),
    });
  };
  const finish = (e: PointerEvent<SVGSVGElement>) => {
    const start = gesture.current;
    if (start && !start.moved && e.type !== "pointercancel") {
      const s = current.current,
        [nx, ny] = position(e.clientX, e.clientY),
        x = s.window.xmin + nx * (s.window.xmax - s.window.xmin),
        target = s.window.ymax - ny * (s.window.ymax - s.window.ymin);
      let index = -1,
        error = Infinity;
      s.functions.forEach((f, i) => {
        if (f.enabled && f.expression)
          try {
            const y = compileExpression(
                f.expression,
                s.angle,
                s.ans,
                s.variables,
              )(x),
              delta = Math.abs(y - target);
            if (delta < error) {
              error = delta;
              index = i;
            }
          } catch {
            /* A curve may be undefined at this x. */
          }
      });
      if (
        index >= 0 &&
        (error / (s.window.ymax - s.window.ymin)) *
          svg.current!.getBoundingClientRect().height <
          24
      )
        dispatch({ type: "traceAt", x, index });
    }
    pointers.current.delete(e.pointerId);
    gesture.current = pointers.current.size
      ? {
          window: current.current.window,
          points: [...pointers.current.values()],
          moved: true,
        }
      : null;
  };
  return {
    ref: svg,
    onPointerDown: begin,
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: finish,
  };
}
