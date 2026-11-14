export function parseDelimited(text: string): string[][] {
  const delimiter = text.includes("\t") ? "\t" : ",",
    rows: string[][] = [],
    row: string[] = [];
  let cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === delimiter || c === "\n" || c === "\r")) {
      row.push(cell.trim());
      cell = "";
      if (c !== delimiter) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some((v) => v)) rows.push([...row]);
        row.length = 0;
      }
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed quoted data field");
  row.push(cell.trim());
  if (row.some((v) => v)) rows.push(row);
  return rows;
}
export const encodeDelimited = (rows: string[][]) =>
  rows
    .map((r) =>
      r
        .map((v) =>
          /[",\n\r]/.test(v) ? '"' + v.replaceAll('"', '""') + '"' : v,
        )
        .join(","),
    )
    .join("\n");

export function parseMatrixText(text: string): string[][] {
  if (!text.trim()) return [];
  return /[",\t]/.test(text)
    ? parseDelimited(text.replaceAll(";", "\n"))
    : text
        .trim()
        .split(/[\n;]+/)
        .map((r) => r.trim().split(/\s+/));
}
