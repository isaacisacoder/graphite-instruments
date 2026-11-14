export interface FieldSpec {
  id: string;
  label: string;
  initial: string;
  multiline?: boolean;
  options?: string[];
}
export interface Operation {
  id: string;
  name: string;
  fields: FieldSpec[];
}
const field = (
  id: string,
  label: string,
  initial: string,
  multiline = false,
): FieldSpec => ({ id, label, initial, multiline });
const principal = field("principal", "Principal", "10000"),
  rate = field("rate", "Annual rate (%)", "5"),
  months = field("months", "Term (months)", "36"),
  expression = field("expression", "Expression", "x^2+2*x+1"),
  variable: FieldSpec = {
    id: "variable",
    label: "Variable",
    initial: "x",
    options: ["x", "y", "z", "k", "t"],
  };
export const OPERATIONS: Record<string, Operation[]> = {
  financial: [
    {
      id: "loan",
      name: "Loan & Amortization",
      fields: [
        principal,
        rate,
        months,
        field("extra", "Extra monthly payment", "0"),
      ],
    },
    {
      id: "growth",
      name: "Compound Growth",
      fields: [
        principal,
        rate,
        field("years", "Years", "10"),
        field("periods", "Periods per year", "12"),
        field("contribution", "Contribution per period", "0"),
      ],
    },
    {
      id: "rate",
      name: "Interest Rate",
      fields: [
        principal,
        months,
        field("payment", "Monthly payment", "299.7089710467"),
      ],
    },
  ],
  cas: [
    { id: "simplify", name: "Simplify", fields: [expression] },
    {
      id: "expand",
      name: "Expand",
      fields: [field("expression", "Expression", "(x+1)^3")],
    },
    {
      id: "factor",
      name: "Factor",
      fields: [field("expression", "Expression", "x^2-1")],
    },
    {
      id: "solve",
      name: "Solve",
      fields: [field("expression", "Equation", "x^2=2"), variable],
    },
  ],
  calculus: [
    { id: "derivative", name: "Derivative", fields: [expression, variable] },
    {
      id: "integral",
      name: "Antiderivative",
      fields: [field("expression", "Expression", "x^2"), variable],
    },
    {
      id: "definite",
      name: "Definite Integral",
      fields: [
        field("expression", "Expression", "x^2"),
        variable,
        field("lower", "Lower bound", "0"),
        field("upper", "Upper bound", "1"),
      ],
    },
    {
      id: "limit",
      name: "Limit",
      fields: [
        field("expression", "Expression", "sin(x)/x"),
        variable,
        field("point", "Approach value", "0"),
      ],
    },
    {
      id: "series",
      name: "Finite Series",
      fields: [
        field("expression", "Summand", "k^2"),
        { ...variable, initial: "k" },
        field("lower", "Lower index", "1"),
        field("upper", "Upper index", "10"),
      ],
    },
  ],
  statistics: [
    {
      id: "summary",
      name: "Descriptive",
      fields: [field("data", "Values", "1, 2, 3, 4, 5", true)],
    },
    {
      id: "normal",
      name: "Normal Distribution",
      fields: [
        field("mean", "Mean", "0"),
        field("sd", "Standard deviation", "1"),
        field("x", "x", "1.96"),
      ],
    },
    {
      id: "regression",
      name: "Linear Regression",
      fields: [field("data", "Pairs (x, y)", "1, 2\n2, 4\n3, 6", true)],
    },
    {
      id: "combinations",
      name: "Combinations",
      fields: [field("n", "n", "10"), field("r", "r", "3")],
    },
    {
      id: "permutations",
      name: "Permutations",
      fields: [field("n", "n", "10"), field("r", "r", "3")],
    },
  ],
  matrix: [
    {
      id: "determinant",
      name: "Determinant",
      fields: [field("a", "Matrix A", "1, 2\n3, 4", true)],
    },
    {
      id: "inverse",
      name: "Inverse",
      fields: [field("a", "Matrix A", "1, 2\n3, 4", true)],
    },
    {
      id: "transpose",
      name: "Transpose",
      fields: [field("a", "Matrix A", "1, 2\n3, 4", true)],
    },
    {
      id: "multiply",
      name: "Multiply",
      fields: [
        field("a", "Matrix A", "1, 2\n3, 4", true),
        field("b", "Matrix B", "2, 0\n0, 2", true),
      ],
    },
    {
      id: "solve",
      name: "Linear System",
      fields: [
        field("a", "Matrix A", "2, 1\n1, 3", true),
        field("b", "Vector b", "5, 6"),
      ],
    },
    {
      id: "dot",
      name: "Dot Product",
      fields: [
        field("a", "Vector a", "1, 2, 3"),
        field("b", "Vector b", "4, 5, 6"),
      ],
    },
    {
      id: "cross",
      name: "Cross Product",
      fields: [
        field("a", "Vector a", "1, 0, 0"),
        field("b", "Vector b", "0, 1, 0"),
      ],
    },
  ],
  discrete: [
    {
      id: "gcd",
      name: "GCD & LCM",
      fields: [field("a", "Integer a", "84"), field("b", "Integer b", "30")],
    },
    {
      id: "factor",
      name: "Prime Factors",
      fields: [field("a", "Integer (2–10¹²)", "84")],
    },
    {
      id: "combinations",
      name: "Combinations",
      fields: [field("n", "n (0–500)", "10"), field("r", "r", "3")],
    },
    {
      id: "permutations",
      name: "Permutations",
      fields: [field("n", "n (0–500)", "10"), field("r", "r", "3")],
    },
  ],
};
