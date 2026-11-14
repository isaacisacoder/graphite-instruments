import fs from "node:fs/promises";
import path from "node:path";
const lock = JSON.parse(await fs.readFile("package-lock.json", "utf8")),
  entries = Object.entries(lock.packages).filter(
    ([key, v]) =>
      key.startsWith("node_modules/") &&
      (!v.dev || /node_modules\/(workbox-[^/]+|vite)$/.test(key)),
  );
const notices = [
  "Graphite Instruments — Third-party notices",
  "Generated from the installed, locked dependencies. Third-party materials retain their own licenses.",
  "Graphite original application code: MIT, copyright 2026 isaacisacoder.",
  "Math.js erf adaptation: src/suite/normalTail.ts exposes complementary tails using Cody coefficients; the Apache-2.0 math.js copyright and NOTICE are preserved below.",
  "Background SVGs, favicon and application icons were created for Graphite; the TI-84 photograph supplied as a visual reference is not distributed.",
  "KaTeX is used for MathML output. Its HTML font stylesheet and font binaries are not included in the production build.",
  "",
];
const rows = [];
for (const [directory] of entries) {
  const pkg = JSON.parse(
      await fs.readFile(path.join(directory, "package.json"), "utf8"),
    ),
    files = (await fs.readdir(directory, { withFileTypes: true }))
      .filter(
        (f) =>
          f.isFile() &&
          /^(licen[cs]e|copying|notice|ofl)([._-]|$)/i.test(f.name),
      )
      .map((f) => f.name);
  if (
    !files.length &&
    !["javascript-natural-sort", "seedrandom"].includes(pkg.name)
  )
    throw Error("Missing license/notice for " + pkg.name);
  const license =
    typeof pkg.license === "string"
      ? pkg.license
      : JSON.stringify(pkg.license ?? pkg.licenses ?? "See notice");
  rows.push({ name: pkg.name, version: pkg.version, license });
  notices.push("=".repeat(72), `${pkg.name} ${pkg.version} — ${license}`);
  if (pkg.name === "javascript-natural-sort" && !files.length) {
    const header =
      (await fs.readFile(path.join(directory, "naturalSort.js"), "utf8")).split(
        "*/",
      )[0] + "*/";
    const grant = (await fs.readFile("LICENSE", "utf8")).split(
      "Permission is hereby",
    )[1];
    notices.push(
      "Upstream MIT declaration and author notice (package omits a standalone LICENSE):",
      header,
      "Source: https://github.com/Bill4Time/javascript-natural-sort",
      "Permission is hereby" + grant,
    );
  }
  if (pkg.name === "seedrandom" && !files.length)
    notices.push(
      (await fs.readFile(path.join(directory, "seedrandom.js"), "utf8")).split(
        "*/",
      )[0] + "*/",
    );
  for (const file of files)
    notices.push(
      `--- ${file} ---`,
      await fs.readFile(path.join(directory, file), "utf8"),
    );
  notices.push("");
}
rows.sort((a, b) => a.name.localeCompare(b.name));
await fs.mkdir("public/legal", { recursive: true });
await fs.writeFile("public/legal/notices.txt", notices.join("\n"));
await fs.writeFile(
  "THIRD_PARTY_NOTICES.md",
  "# Third-party notices\n\nGraphite’s original application code is MIT licensed. Dependencies, fonts and adapted code retain their own notices; this document does not relicense them. Complete license texts and required notices are distributed in [public/legal/notices.txt](public/legal/notices.txt).\n\n`src/suite/normalTail.ts` adapts math.js’s Apache-2.0 erf approximation to expose complementary tails; that file records the modification. Inter and IBM Plex Mono are unmodified SIL OFL fonts. Original SVG backgrounds and Graphite icons are project-created; no Texas Instruments logos, firmware or reference photograph are distributed. KaTeX emits native MathML; its optional HTML font assets are not shipped. Workbox runtime/generated service-worker components and Vite’s generated helper are included in the notices.\n\n| Package | Version | License |\n| --- | --- | --- |\n" +
    rows.map((r) => `| ${r.name} | ${r.version} | ${r.license} |`).join("\n") +
    "\n\nRegenerate with `npm run notices` after `npm ci` or dependency updates. Build/test-only dependencies remain subject to their upstream licenses; see the lockfile and each installed package.\n",
);
console.log(
  `Wrote complete notices for ${rows.length} runtime, font and generated-runtime packages.`,
);
