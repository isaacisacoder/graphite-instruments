import { it, expect } from "vitest";
import { sampleSurface } from "./surface";
import { restoreLite } from "./liteState";
it("samples a true two-variable surface with finite coordinates", () => {
  const lines = sampleSurface("x^2+y^2", 2);
  expect(lines.length).toBe(58);
  for (const line of lines)
    for (const [x, y, z] of line.points) {
      expect(z).toBeCloseTo(x * x + y * y, 10);
      expect(Number.isFinite(z)).toBe(true);
    }
});
it("splits wireframe segments at shifted poles", () => {
  const pole = 0.09,
    lines = sampleSurface(`1/(x-${pole})`, 5);
  for (const line of lines)
    expect(line.points[0][0] < pole && line.points.at(-1)![0] > pole).toBe(
      false,
    );
});
it("restores standalone calculator history and recovers corrupt payloads", () => {
  const state = restoreLite(
    JSON.stringify({
      entry: "",
      history: [null, { expression: "2+3", result: 5 }],
      ans: 5,
      angle: "DEG",
      afterResult: true,
    }),
  );
  expect(state.history).toHaveLength(1);
  expect(state.ans).toBe(5);
  expect(state.angle).toBe("DEG");
  expect(state.afterResult).toBe(true);
  expect(restoreLite("{bad").entry).toBe("");
});
