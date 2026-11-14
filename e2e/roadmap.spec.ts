import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
async function tab(p: Page, name: string) {
  const control = p.getByRole("tab", { name, exact: true });
  if (await control.isVisible()) await control.click();
}
async function open(p: Page, route: string) {
  await p.goto(`/#/${route}`);
  await p.locator("main").first().waitFor();
}
async function calculate(p: Page) {
  await p.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(p.locator(".tool-output")).toHaveAttribute("aria-busy", "false");
  await expect(p.locator(".tool-output dl")).toBeVisible();
}
test("calculator selections, held Enter, C, AC and scientific degrees", async ({
  page: p,
}) => {
  await open(p, "basic");
  const expression = p.getByLabel("Expression", { exact: true });
  await expression.fill("1234");
  await expression.selectText();
  await p.getByRole("button", { name: "9", exact: true }).click();
  await expect(expression).toHaveValue("9");
  await expression.fill("2+3*4");
  await expression.focus();
  await p.keyboard.down("Enter");
  await p.keyboard.down("Enter");
  await p.keyboard.down("Enter");
  await p.keyboard.up("Enter");
  await expect(p.locator(".lite-display output")).toHaveText("14");
  await expect(p.locator(".lite-history button")).toHaveCount(1);
  await p.getByRole("button", { name: "All clear", exact: true }).click();
  await expect(p.locator(".lite-display output")).toHaveText("0");
  await expect(p.locator(".lite-history button")).toHaveCount(1);
  await open(p, "scientific");
  await p.getByLabel("Angle unit", { exact: true }).selectOption("DEG");
  await p.getByLabel("Expression", { exact: true }).fill("sin(30)");
  await p.getByRole("button", { name: "Evaluate", exact: true }).click();
  await expect(p.locator(".lite-display output")).toHaveText("0.5");
});
test("specialist results and operations survive navigation and reload", async ({
  page: p,
}) => {
  await open(p, "financial");
  await p.getByRole("button", { name: "Compound Growth", exact: true }).click();
  await calculate(p);
  const result = await p.locator(".tool-output dl").textContent();
  await open(p, "basic");
  await p.getByRole("heading", { name: "Basic", exact: true }).waitFor();
  await open(p, "financial");
  await expect(
    p.getByRole("button", { name: "Compound Growth", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(p.locator(".tool-output dl")).toHaveText(result!);
  await p.reload();
  await expect(p.locator(".tool-output dl")).toHaveText(result!);
  await p.getByLabel("Principal", { exact: true }).fill("20000");
  await expect(p.locator(".tool-output dl")).toHaveCount(0);
  await p.reload();
  await expect(p.locator(".tool-output dl")).toHaveCount(0);
});
test("matrix grid paste validates atomically and scaled determinants remain nonzero", async ({
  page: p,
}) => {
  await open(p, "matrix");
  const first = p.getByLabel("Matrix A row 1 column 1", { exact: true });
  await first.fill("1e16");
  await p.getByLabel("Matrix A row 1 column 2", { exact: true }).fill("0");
  await p.getByLabel("Matrix A row 2 column 1", { exact: true }).fill("0");
  await p.getByLabel("Matrix A row 2 column 2", { exact: true }).fill("1");
  await calculate(p);
  await expect(p.locator(".tool-output dd")).toHaveText("1e+16");
  await first.evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "1,2\n3,oops");
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(p.locator('.matrix-entry [role="alert"]')).toContainText(
    "Row 2, column 2",
  );
  await expect(first).toHaveValue("1e16");
  await p.getByRole("button", { name: "Text editor", exact: true }).click();
  await expect(p.getByLabel("Matrix A", { exact: true })).toHaveValue(/1e16/);
});
test("graph angle mode, linked trace, undo and hidden notices", async ({
  page: p,
}) => {
  await open(p, "plot");
  await p.getByLabel("Inspect graph item").selectOption("c:y1");
  await expect(p.locator(".trace-controls output")).toHaveText("(0, 0)");
  await p.getByLabel("Y1 expression", { exact: true }).fill("x^2+5");
  await expect(p.locator(".trace-controls output")).toHaveText("(0, 5)");
  await p.getByLabel("Graph angle unit").selectOption("DEG");
  await tab(p, "Points");
  await p.getByLabel("Point 1 x", { exact: true }).fill("sin(30)");
  await p.getByLabel("Inspect graph item").selectOption("p:p1");
  await expect(p.locator(".trace-controls output")).toHaveText("(0.5, 4)");
  await p.getByRole("button", { name: "Remove point 1", exact: true }).click();
  await expect(p.locator(".trace-controls output")).toContainText("Undefined");
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(p.locator(".trace-controls output")).toHaveText("(0.5, 4)");
});
test("points drag without panning and snap to the displayed grid", async ({
  page: p,
}) => {
  await open(p, "plot");
  await tab(p, "Points");
  await p.getByLabel("Snap dragged points to grid").check();
  const before = await p.locator(".plot-viewport svg").getAttribute("viewBox");
  const hit = p.locator(".point-hit").first();
  const box = await hit.boundingBox();
  if (!box) throw Error("Point hit area missing");
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, {
    steps: 8,
  });
  await p.mouse.up();
  await expect(p.getByLabel("Point 1 x", { exact: true })).not.toHaveValue(
    "-2",
  );
  await expect(p.locator(".plot-viewport svg")).toHaveAttribute(
    "viewBox",
    before!,
  );
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(p.getByLabel("Point 1 x", { exact: true })).toHaveValue("-2");
});
test("bulk point data, workspace import and image exports", async ({
  page: p,
}) => {
  await open(p, "plot");
  await tab(p, "Points");
  await p.getByText("Paste coordinate data", { exact: true }).click();
  await p.getByLabel("CSV or tab-separated coordinates").fill("x,y\n3,9\n4,16");
  await p.getByRole("button", { name: "Append rows", exact: true }).click();
  await expect(p.getByLabel("Point 5 x", { exact: true })).toHaveValue("4");
  await tab(p, "Window");
  await p.getByText("Workspace files", { exact: true }).click();
  const saved = p.waitForEvent("download");
  await p.getByRole("button", { name: "Save workspace", exact: true }).click();
  const download = await saved;
  expect(download.suggestedFilename()).toBe("graphite-workspace.json");
  await p.getByLabel("Workspace file", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(p.locator(".plot-editor [role=status]")).toContainText(
    "Unsupported",
  );
  const path = await download.path();
  if (!path) throw Error("Missing downloaded workspace");
  const workspace = JSON.parse(await readFile(path, "utf8"));
  workspace.curves[0].expression = "x+7";
  await p
    .getByLabel("Workspace file", { exact: true })
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(workspace)),
    });
  await expect(p.locator(".plot-editor [role=status]")).toHaveText(
    "Workspace opened",
  );
  await tab(p, "Functions");
  await expect(p.getByLabel("Y1 expression", { exact: true })).toHaveValue(
    "x+7",
  );
  await p.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(p.getByLabel("Y1 expression", { exact: true })).toHaveValue(
    "x^2",
  );
  await p.getByText("Export image", { exact: true }).click();
  for (const name of ["SVG", "PNG"]) {
    const event = p.waitForEvent("download");
    await p.getByRole("button", { name, exact: true }).click();
    const d = await event;
    expect(d.suggestedFilename()).toMatch(name === "SVG" ? /\.svg$/ : /\.png$/);
  }
});
test("sliders, numerical analysis and integral shading work", async ({
  page: p,
}) => {
  await open(p, "plot");
  await p.getByLabel("Y1 expression", { exact: true }).fill("a*x^2-4");
  await p.getByRole("button", { name: "Add slider a", exact: true }).click();
  await p.getByLabel("Slider a", { exact: true }).fill("2");
  await p.getByLabel("Y1 expression", { exact: true }).fill("x^2-4");
  await p.getByText("Analyze", { exact: true }).click();
  await p.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(p.locator(".graph-analysis div[aria-live]")).toContainText(
    "(-2, 0)",
  );
  await p.getByLabel("Operation", { exact: true }).selectOption("integral");
  await p.getByLabel("Lower bound", { exact: true }).fill("0");
  await p.getByLabel("Upper bound", { exact: true }).fill("1");
  await p.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(p.locator(".graph-analysis div[aria-live]")).toContainText(
    "≈ -3.666",
  );
  await expect(p.locator(".integral-shade")).toHaveCount(1);
});
test("full-screen and appearance focus stay within their modal", async ({
  page: p,
}) => {
  await open(p, "plot");
  await p.getByRole("button", { name: "Full screen", exact: true }).click();
  await p.locator(".plot-viewport svg").focus();
  await p.keyboard.press("Tab");
  expect(
    await p.evaluate(() => !!document.activeElement?.closest(".plot-expanded")),
  ).toBe(true);
  await p.keyboard.press("Escape");
  await expect(
    p.getByRole("button", { name: "Full screen", exact: true }),
  ).toBeFocused();
  await p.getByRole("button", { name: "Appearance", exact: true }).click();
  await p
    .getByLabel("Sound profile", { exact: true })
    .selectOption("typewriter");
  await p.getByLabel("Sound profile", { exact: true }).focus();
  await p.keyboard.press("Tab");
  expect(
    await p.evaluate(
      () => !!document.activeElement?.closest(".appearance-panel"),
    ),
  ).toBe(true);
  await p.keyboard.press("Escape");
  await expect(
    p.getByRole("button", { name: "Appearance", exact: true }),
  ).toBeFocused();
});
test("all finishes, favorites and responsive layouts remain usable", async ({
  page: p,
}) => {
  await open(p, "");
  await p.getByRole("button", { name: "Favorite Basic", exact: true }).click();
  await p.reload();
  await expect(
    p.getByRole("button", { name: "Unfavorite Basic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await open(p, "plot");
  await p.getByRole("button", { name: "Appearance", exact: true }).click();
  for (const style of [
    "graphite",
    "classic",
    "onyx",
    "precision",
    "soft-touch",
    "blush",
    "sage",
    "lavender-mint",
    "retro-typewriter",
    "porcelain",
    "stone",
    "amber",
    "clear-ice",
    "clear-lilac",
    "clear-mint",
  ]) {
    await p.getByLabel("Key style", { exact: true }).selectOption(style);
    await expect(p.locator(".plot-instrument")).toHaveAttribute(
      "data-key-style",
      style,
    );
  }
  await p
    .getByRole("button", { name: "Close appearance", exact: true })
    .click();
  for (const width of [320, 390, 768, 1920]) {
    await p.setViewportSize({ width, height: 900 });
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await open(p, "");
  await expect(
    p.getByRole("link", { name: "Continue working", exact: true }),
  ).toHaveAttribute("href", "#/plot");
});
test("3D bounds, keyboard rotation, zoom and readable axes", async ({
  page: p,
}) => {
  await open(p, "surface");
  await p.getByLabel("z minimum", { exact: true }).fill("-20");
  await p.getByLabel("z maximum", { exact: true }).fill("20");
  await p.getByRole("button", { name: "Plot surface", exact: true }).click();
  const line = p.locator(".surface-plot path").first(),
    before = await line.getAttribute("d");
  await p.locator(".surface-plot").focus();
  await p.keyboard.press("ArrowRight");
  await expect(line).not.toHaveAttribute("d", before!);
  await p.getByRole("button", { name: "Zoom surface in", exact: true }).click();
  await expect(p.getByText("Values outside z", { exact: false })).toContainText(
    "20",
  );
  expect(
    await p
      .locator(".surface-plot text")
      .first()
      .evaluate((n) => getComputedStyle(n).fill),
  ).not.toBe("rgb(238, 240, 230)");
});
test("graph and specialist accessibility scan", async ({ page: p }) => {
  for (const route of ["plot", "financial", "basic"]) {
    await open(p, route);
    const result = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
