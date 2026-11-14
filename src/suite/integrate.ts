export interface IntegralEstimate {
  value: number;
  error: number;
  evaluations: number;
}
const nodes = [
  0.9914553711208126, 0.9491079123427585, 0.8648644233597691,
  0.7415311855993945, 0.5860872354676911, 0.4058451513773972,
  0.2077849550078985, 0,
];
const kronrod = [
  0.02293532201052922, 0.06309209262997855, 0.1047900103222502,
  0.1406532597155259, 0.1690047266392679, 0.1903505780647854,
  0.2044329400752989, 0.2094821410847278,
];
const gauss = [
  0.1294849661688697, 0.2797053914892767, 0.3818300505051189,
  0.4179591836734694,
];
/** Embedded 7/15 Gauss–Kronrod rules with a global, bounded error budget. */
export function integrate(
  fn: (x: number) => number,
  a: number,
  b: number,
  absolute = 1e-10,
  relative = 1e-8,
): IntegralEstimate {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(b - a))
    throw Error("Use finite integration bounds");
  if (a === b) return { value: 0, error: 0, evaluations: 0 };
  if (a > b) {
    const r = integrate(fn, b, a, absolute, relative);
    return { ...r, value: -r.value };
  }
  let evaluations = 0;
  const sample = (x: number) => {
    if (++evaluations > 50000)
      throw Error(
        "Integral did not converge; split the interval or simplify the expression",
      );
    const y = fn(x);
    if (!Number.isFinite(y))
      throw Error("Undefined value inside integration interval");
    return y;
  };
  const panel = (lo: number, hi: number, depth: number) => {
    const half = (hi - lo) / 2,
      mid = lo + half;
    let k = 0,
      g = 0,
      abs = 0;
    for (let i = 0; i < 8; i++) {
      const left = sample(mid - half * nodes[i]),
        right = i === 7 ? 0 : sample(mid + half * nodes[i]),
        pair = left + right;
      k += kronrod[i] * pair;
      abs += kronrod[i] * (Math.abs(left) + Math.abs(right));
      if (i % 2 === 1) g += gauss[(i - 1) / 2] * pair;
    }
    return {
      lo,
      hi,
      depth,
      value: k * half,
      error: Math.max(
        Math.abs((k - g) * half),
        abs * half * Number.EPSILON * 50,
      ),
    };
  };
  const panels = Array.from({ length: 16 }, (_, i) =>
    panel(a + ((b - a) * i) / 16, a + ((b - a) * (i + 1)) / 16, 0),
  );
  while (true) {
    const value = panels.reduce((s, p) => s + p.value, 0),
      error = panels.reduce((s, p) => s + p.error, 0);
    if (!Number.isFinite(value)) throw Error("Integral exceeds numeric range");
    if (error <= Math.max(absolute, relative * Math.abs(value)))
      return { value, error, evaluations };
    panels.sort((a, b) => b.error - a.error);
    const p = panels.shift()!;
    if (p.depth >= 40 || p.lo + (p.hi - p.lo) / 2 === p.lo)
      throw Error(
        "Integral did not converge; check the domain or split the interval",
      );
    const mid = p.lo + (p.hi - p.lo) / 2;
    panels.push(panel(p.lo, mid, p.depth + 1), panel(mid, p.hi, p.depth + 1));
  }
}
