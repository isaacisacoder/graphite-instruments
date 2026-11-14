export const INSTRUMENTS = [
  {
    id: "basic",
    name: "Basic",
    functions: "Arithmetic · Percent · History",
    mark: "±",
  },
  {
    id: "scientific",
    name: "Scientific",
    functions: "Trigonometry · Powers · Logarithms",
    mark: "sin",
  },
  {
    id: "graphing",
    name: "Graphing",
    functions: "2D functions · 3D surfaces · Trace",
    mark: "ƒ",
  },
  {
    id: "financial",
    name: "Financial",
    functions: "Loans · Compound growth · Amortization",
    mark: "%",
  },
  {
    id: "cas",
    name: "Computer Algebra",
    functions: "Simplify · Factor · Exact solutions",
    mark: "x²",
  },
  {
    id: "calculus",
    name: "Calculus & Analysis",
    functions: "Derivatives · Integrals · Limits · Series",
    mark: "∫",
  },
  {
    id: "statistics",
    name: "Statistics & Probability",
    functions: "Distributions · Regression · Summary",
    mark: "σ",
  },
  {
    id: "matrix",
    name: "Matrix & Linear Algebra",
    functions: "Matrices · Systems · Vectors",
    mark: "[ ]",
  },
  {
    id: "discrete",
    name: "Number Theory",
    functions: "GCD · LCM · Factors · Combinatorics",
    mark: "ℤ",
  },
] as const;
export type Instrument = (typeof INSTRUMENTS)[number]["id"];
export type Route = "home" | Instrument | "surface" | "plot";
export function routeFromHash(): Route {
  const route = window.location.hash.replace(/^#\/?/, "");
  return route === "plot" ||
    route === "surface" ||
    INSTRUMENTS.some((item) => item.id === route)
    ? (route as Route)
    : "home";
}
