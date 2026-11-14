import { erf } from "mathjs/number";
// Adapted from math.js function/special/erf.js (Apache-2.0), using Cody's coefficients.
// Copyright 2013–2026 Jos de Jong and math.js contributors; see THIRD_PARTY_NOTICES.md.
// Modified to expose complementary tails before subtraction from one.
const p = [
  0.564188496988670089, 8.88314979438837594, 66.1191906371416295,
  298.635138197400131, 881.95222124176909, 1712.04761263407058,
  2051.07837782607147, 1230.33935479799725, 2.15311535474403846e-8,
];
const q = [
  15.7449261107098347, 117.693950891312499, 537.181101862009858,
  1621.38957456669019, 3290.79923573345963, 4362.61909014324716,
  3439.36767414372164, 1230.33935480374942,
];
const r = [
    0.305326634961232344, 0.360344899949804439, 0.125781726111229246,
    0.0160837851487422766, 0.000658749161529837803, 0.0163153871373020978,
  ],
  s = [
    2.56852019228982242, 1.87295284992346047, 0.527905102951428412,
    0.0605183413124413191, 0.00233520497626869185,
  ];
export function normalTail(z: number) {
  const y = Math.abs(z) / Math.SQRT2;
  if (y === 0) return 0.5;
  if (y < 0.46875) return (1 - erf(y)) / 2;
  if (y > 27.3) return 0;
  let ratio: number;
  if (y <= 4) {
    let numerator = p[8] * y,
      denominator = y;
    for (let i = 0; i < 7; i++) {
      numerator = (numerator + p[i]) * y;
      denominator = (denominator + q[i]) * y;
    }
    ratio = (numerator + p[7]) / (denominator + q[7]);
  } else {
    const inv = 1 / (y * y);
    let numerator = r[5] * inv,
      denominator = inv;
    for (let i = 0; i < 4; i++) {
      numerator = (numerator + r[i]) * inv;
      denominator = (denominator + s[i]) * inv;
    }
    ratio =
      (1 / Math.sqrt(Math.PI) -
        (inv * (numerator + r[4])) / (denominator + s[4])) /
      y;
  }
  const rounded = Math.floor(y * 16) / 16;
  return (
    0.5 *
    Math.exp(-rounded * rounded) *
    Math.exp(-(y - rounded) * (y + rounded)) *
    ratio
  );
}
