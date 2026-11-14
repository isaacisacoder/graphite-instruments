import { num, integer, finite, result, type ToolResult } from "./numeric";
export function finance(
  operation: string,
  f: Record<string, string>,
): ToolResult {
  const principal = num(f.principal, "Principal", 0, 1e15);
  if (operation === "growth") {
    const annual = num(f.rate, "Annual rate", -99, 1000) / 100,
      years = num(f.years, "Years", 0.01, 100),
      periods = integer(f.periods, "Periods per year", 1, 365),
      payment = num(f.contribution, "Contribution", 0, 1e12),
      n = years * periods,
      r = annual / periods,
      growth = finite(Math.exp(n * Math.log1p(r))),
      future = finite(
        principal * growth +
          payment * (r === 0 ? n : Math.expm1(n * Math.log1p(r)) / r),
      );
    return result({
      "Future value": future,
      Contributions: principal + payment * n,
      Growth: future - principal - payment * n,
    });
  }
  const months = integer(f.months, "Term in months", 1, 1200);
  if (principal === 0) throw Error("Principal must be greater than zero");
  if (operation === "rate") {
    const payment = num(f.payment, "Payment", 0, 1e15);
    if (
      Math.abs(payment - principal / months) <=
      ((Number.EPSILON * principal) / months) * 8
    )
      return result({ "Annual nominal rate (%)": 0, "Monthly rate (%)": 0 });
    if (payment * months < principal)
      throw Error("Payment is too small for a nonnegative interest rate");
    const pmt = (r: number) =>
      r === 0
        ? principal / months
        : (principal * r) / -Math.expm1(-months * Math.log1p(r));
    let low = 0,
      high = 1;
    while (pmt(high) < payment && high < 100) high *= 2;
    if (pmt(high) < payment)
      throw Error("Interest rate is outside the supported range");
    for (let i = 0; i < 120; i++) {
      const mid = (low + high) / 2;
      if (pmt(mid) > payment) high = mid;
      else low = mid;
    }
    return result({
      "Annual nominal rate (%)": ((low + high) / 2) * 1200,
      "Monthly rate (%)": ((low + high) / 2) * 100,
    });
  }
  const r = num(f.rate, "Annual rate", 0, 1000) / 1200,
    payment =
      r === 0
        ? principal / months
        : (principal * r) / -Math.expm1(-months * Math.log1p(r)),
    extra = num(f.extra, "Extra monthly payment", 0, 1e15),
    rows: string[][] = [];
  let balance = principal,
    interestTotal = 0,
    paid = 0;
  if (r > 0 && payment + extra <= principal * r)
    throw Error(
      "Rate and term exceed payment precision; shorten the term or lower the rate",
    );
  for (let i = 1; i <= months && balance > 0; i++) {
    const interest = balance * r,
      actual = Math.min(balance + interest, payment + extra),
      principalPaid = actual - interest;
    balance = Math.max(0, balance - principalPaid);
    interestTotal += interest;
    paid += actual;
    rows.push([
      String(i),
      actual.toFixed(2),
      principalPaid.toFixed(2),
      interest.toFixed(2),
      balance.toFixed(2),
    ]);
  }
  return {
    ...result({
      "Monthly payment": payment,
      "Total paid": finite(paid),
      "Total interest": finite(interestTotal),
      Payments: rows.length,
    }),
    table: {
      headers: ["Month", "Payment", "Principal", "Interest", "Balance"],
      rows,
    },
    note: "Fixed rate, end-of-month payments. Excludes taxes and fees.",
  };
}
