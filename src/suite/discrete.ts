import { integer, result, type ToolResult } from "./numeric";
function whole(s: string) {
  if (!/^-?\d{1,100}$/.test(s.trim()))
    throw Error("Use whole numbers of up to 100 digits");
  return BigInt(s.trim());
}
const abs = (n: bigint) => (n < 0n ? -n : n);
export function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
export function combinatoric(n: number, r: number, permutation = false) {
  if (r > n) throw Error("r cannot exceed n");
  let value = 1n;
  const count = permutation ? r : Math.min(r, n - r);
  for (let i = 1; i <= count; i++)
    value = permutation
      ? value * BigInt(n - i + 1)
      : (value * BigInt(n - count + i)) / BigInt(i);
  return value.toString();
}
export function discrete(
  operation: string,
  f: Record<string, string>,
): ToolResult {
  if (operation === "combinations" || operation === "permutations") {
    const n = integer(f.n, "n", 0, 500),
      r = integer(f.r, "r", 0, 500);
    return result({
      [operation === "combinations" ? "nCr" : "nPr"]: combinatoric(
        n,
        r,
        operation === "permutations",
      ),
    });
  }
  const a = whole(f.a);
  if (operation === "gcd" || operation === "lcm") {
    const b = whole(f.b),
      d = gcd(a, b);
    return result({
      GCD: d.toString(),
      LCM: (d === 0n ? 0n : abs((a / d) * b)).toString(),
    });
  }
  if (a < 2n || a > 1000000000000n)
    throw Error("Use an integer from 2 to 10¹²");
  let remaining = a;
  const factors: [bigint, number][] = [];
  for (let p = 2n; p * p <= remaining; p = p === 2n ? 3n : p + 2n) {
    let power = 0;
    while (remaining % p === 0n) {
      remaining /= p;
      power++;
    }
    if (power) factors.push([p, power]);
  }
  if (remaining > 1n) factors.push([remaining, 1]);
  return result({
    "Prime factorization": factors
      .map(([p, n]) => `${p}${n > 1 ? `^${n}` : ""}`)
      .join(" × "),
    Prime: factors.length === 1 && factors[0][1] === 1 ? "Yes" : "No",
  });
}
