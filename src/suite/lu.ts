/** Equilibrate rows before pivoting; a large row must not erase a smaller one. */
export function factorize(a: number[][]) {
  const n = a.length;
  if (!n || a.some((r) => r.length !== n)) throw Error("Use a square matrix");
  const scales = a.map((r) => Math.max(...r.map(Math.abs))),
    lu = a.map((r, i) => r.map((v) => (scales[i] ? v / scales[i] : 0))),
    order = Array.from({ length: n }, (_, i) => i);
  let sign = 1,
    singular = false,
    unstable = false;
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++)
      if (Math.abs(lu[i][k]) > Math.abs(lu[pivot][k])) pivot = i;
    if (lu[pivot][k] === 0) {
      singular = true;
      break;
    }
    if (Math.abs(lu[pivot][k]) < Number.EPSILON * n * 16) unstable = true;
    if (pivot !== k) {
      [lu[k], lu[pivot]] = [lu[pivot], lu[k]];
      [order[k], order[pivot]] = [order[pivot], order[k]];
      sign = -sign;
    }
    for (let i = k + 1; i < n; i++) {
      lu[i][k] /= lu[k][k];
      for (let j = k + 1; j < n; j++) lu[i][j] -= lu[i][k] * lu[k][j];
    }
  }
  const solve = (b: number[]) => {
    if (singular) throw Error("Matrix is singular");
    if (b.length !== n) throw Error("Provide one value per equation");
    const x = order.map((i) => b[i] / scales[i]);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < i; j++) x[i] -= lu[i][j] * x[j];
    for (let i = n - 1; i >= 0; i--) {
      for (let j = i + 1; j < n; j++) x[i] -= lu[i][j] * x[j];
      x[i] /= lu[i][i];
      if (!Number.isFinite(x[i])) throw Error("Result exceeds numeric range");
    }
    return x;
  };
  let log = 0;
  for (let i = 0; i < n; i++) {
    log += Math.log(scales[i] || 1) + Math.log(Math.abs(lu[i][i]) || 1);
    if (lu[i][i] < 0) sign = -sign;
  }
  let determinant = singular ? 0 : sign * Math.exp(log);
  if (Object.is(determinant, -0)) determinant = 0;
  if (!singular) {
    const sums = Array(n).fill(0) as number[];
    for (let j = 0; j < n; j++) {
      const c = solve(a.map((_, i) => (i === j ? 1 : 0)));
      c.forEach((v, i) => (sums[i] += Math.abs(v)));
    }
    const norm = Math.max(
      ...a.map((r) => r.reduce((s, v) => s + Math.abs(v), 0)),
    );
    if (norm * Math.max(...sums) > 1e12) unstable = true;
  }
  return {
    determinant,
    solve,
    singular,
    warning: unstable
      ? "Matrix is ill-conditioned; the result may have reduced precision."
      : undefined,
  };
}
