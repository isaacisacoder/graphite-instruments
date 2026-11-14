import { compileExpression } from "../math";
export type Point3 = [number, number, number];
export function sampleSurface(
  expression: string,
  range: number,
  zmin = -10,
  zmax = 10,
): { points: Point3[]; axis: number }[] {
  const fn = compileExpression(expression, "RAD", 0, { y: 0 }),
    lines: { points: Point3[]; axis: number }[] = [];
  for (let axis = 0; axis < 2; axis++)
    for (let line = 0; line <= 28; line++) {
      let points: Point3[] = [],
        previous: Point3 | undefined;
      const split = () => {
        if (points.length > 1) lines.push({ points, axis });
        points = [];
        previous = undefined;
      };
      for (let step = 0; step <= 50; step++) {
        const fixed = -range + (2 * range * line) / 28,
          t = -range + (2 * range * step) / 50,
          x = axis ? fixed : t,
          y = axis ? t : fixed;
        try {
          const z = fn(x, { y });
          if (z < zmin || z > zmax) {
            split();
            continue;
          }
          if (previous) {
            try {
              const mid = fn(previous[0] + (x - previous[0]) / 2, {
                y: previous[1] + (y - previous[1]) / 2,
              });
              if (
                Math.abs(mid - (previous[2] + z) / 2) > (zmax - zmin) * 0.15 ||
                mid < zmin ||
                mid > zmax
              )
                split();
            } catch {
              split();
            }
          }
          points.push([x, y, z]);
          previous = [x, y, z];
        } catch {
          split();
        }
      }
      split();
    }
  return lines;
}
