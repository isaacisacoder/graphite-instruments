import { parseDelimited } from "./delimited";
import type { Angle } from "../math";
import {
  restorePlot,
  readPoint,
  newId,
  validParameter,
  type PlotDraft,
  type PointRow,
} from "./plotModel";
import { validWindow } from "../plot";
export function parsePoints(
  text: string,
  angle: Angle = "RAD",
  variables: Record<string, number> = {},
): PointRow[] {
  let rows = parseDelimited(text);
  if (rows[0]?.join(",").toLowerCase() === "x,y") rows = rows.slice(1);
  if (!rows.length || rows.length > 200)
    throw Error("Paste 1–200 coordinate rows");
  return rows.map((r, i) => {
    if (
      r.length !== 2 ||
      r.some((v) => v.length > 80) ||
      !readPoint({ x: r[0], y: r[1] }, angle, variables)
    )
      throw Error(`Row ${i + 1}: enter two finite coordinate expressions`);
    return { id: newId(), x: r[0], y: r[1] };
  });
}
export function importWorkspace(text: string): PlotDraft {
  if (text.length > 500000) throw Error("Workspace file is too large");
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw Error("Invalid workspace JSON");
  }
  if (!v || typeof v !== "object") throw Error("Invalid workspace file");
  const d = v as PlotDraft;
  if (
    d.version !== 2 ||
    !validWindow(d.window) ||
    !Array.isArray(d.curves) ||
    d.curves.length < 1 ||
    d.curves.length > 12 ||
    !Array.isArray(d.points) ||
    d.points.length > 200 ||
    !Array.isArray(d.parameters) ||
    d.parameters.length > 24
  )
    throw Error("Unsupported or invalid workspace");
  if (
    [d.equalUnits, d.snap, d.labels, d.degrees].some(
      (v) => typeof v !== "boolean",
    )
  )
    throw Error("Invalid workspace display settings");
  const ids = new Set<string>();
  for (const row of [...d.curves, ...d.points, ...d.parameters]) {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw Error("Workspace entries must be objects");
    if (typeof row.id !== "string" || !row.id || ids.has(row.id))
      throw Error("Workspace IDs must be unique");
    ids.add(row.id);
  }
  if (
    d.curves.some(
      (c) =>
        typeof c.expression !== "string" ||
        c.expression.length > 240 ||
        typeof c.enabled !== "boolean",
    ) ||
    d.points.some(
      (p) =>
        typeof p.x !== "string" ||
        typeof p.y !== "string" ||
        p.x.length > 80 ||
        p.y.length > 80,
    ) ||
    d.parameters.some((p) => !validParameter(p)) ||
    new Set(d.parameters.map((p) => p.name)).size !== d.parameters.length
  )
    throw Error("Invalid workspace entries");
  return restorePlot(text);
}
export function download(
  name: string,
  data: Blob | string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(
      typeof data === "string" ? new Blob([data], { type }) : data,
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportImage(svg: SVGSVGElement, png: boolean) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const sources = [svg, ...svg.querySelectorAll("*")],
    targets = [copy, ...copy.querySelectorAll("*")];
  for (let i = 0; i < sources.length; i++) {
    const cs = getComputedStyle(sources[i]);
    for (const prop of [
      "fill",
      "stroke",
      "stroke-width",
      "font-family",
      "font-size",
      "font-weight",
      "paint-order",
    ])
      targets[i].setAttribute(prop, cs.getPropertyValue(prop));
  }
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(svg.clientWidth));
  copy.setAttribute("height", String(svg.clientHeight));
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", getComputedStyle(svg.parentElement!).backgroundColor);
  copy.prepend(bg);
  const xml = new XMLSerializer().serializeToString(copy);
  if (!png) {
    download("graphite-graph.svg", xml, "image/svg+xml");
    return;
  }
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = svg.clientWidth * 2;
    canvas.height = svg.clientHeight * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Image export unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) =>
        b ? resolve(b) : reject(Error("Image export failed")),
      ),
    );
    download("graphite-graph.png", blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}
