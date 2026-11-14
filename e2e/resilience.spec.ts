import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
test("worker startup failures keep inputs and permit retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (!localStorage.getItem("permit-worker"))
          throw Error("Simulated startup failure");
        super(url, options);
      }
    };
  });
  await page.goto("/#/financial");
  await page.getByLabel("Principal", { exact: true }).fill("25000");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Unable to start");
  await expect(page.getByLabel("Principal", { exact: true })).toHaveValue(
    "25000",
  );
  await page.evaluate(() => localStorage.setItem("permit-worker", "true"));
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator(".tool-output dl")).toBeVisible();
});
test("failed route loading offers a working reload retry and retains drafts", async ({
  page,
}) => {
  await page.goto("/#/basic");
  await page.getByLabel("Expression", { exact: true }).fill("42+8");
  await page.route("**/Tool-*.js", (route) => route.abort());
  await page.goto("/#/financial");
  await expect(
    page.getByRole("heading", {
      name: "Unable to open this instrument",
      exact: true,
    }),
  ).toBeVisible();
  await page.unroute("**/Tool-*.js");
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Retry", exact: true }).click(),
  ]);
  await expect(
    page.getByRole("heading", { name: "Financial", exact: true }),
  ).toBeVisible();
  await page.goto("/#/basic");
  await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(
    "42+8",
  );
});
test("point-limit errors remain visible while placing and tracing", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "graphite:plot",
      JSON.stringify({
        version: 2,
        equalUnits: false,
        snap: false,
        parameters: [],
        curves: [{ id: "y1", expression: "x^2", enabled: true }],
        points: Array.from({ length: 200 }, (_, i) => ({
          id: `test-point-${i}`,
          x: "0",
          y: "0",
        })),
        window: { xmin: -10, xmax: 10, ymin: -10, ymax: 10, xscl: 2, yscl: 2 },
        labels: true,
        degrees: false,
      }),
    ),
  );
  await page.goto("/#/plot");
  await expect(page.locator(".point-table tbody tr")).toHaveCount(200);
  const tab = page.getByRole("tab", { name: "Points", exact: true });
  if (await tab.isVisible()) await tab.click();
  await page
    .getByRole("button", { name: "Place on graph", exact: true })
    .click();
  const graph = page.locator(".plot-viewport svg"),
    box = await graph.boundingBox();
  if (!box) throw Error("No graph");
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.25);
  await expect(page.locator(".graph-message[role=status]")).toContainText(
    "Limit of 200",
  );
  await expect(page.locator(".point-table tbody tr")).toHaveCount(200);
});
test("reduced motion keeps slider animation manual", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/plot");
  await page.getByLabel("Y1 expression", { exact: true }).fill("a*x");
  await page.getByRole("button", { name: "Add slider a", exact: true }).click();
  await page
    .getByRole("button", { name: "Play slider a", exact: true })
    .click();
  await expect(
    page.getByText("Animation is off while reduced motion is enabled.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Slider a", { exact: true })).toHaveValue("1");
});
test("an available application update waits for approval and preserves work", async ({
  browser,
}) => {
  let revision = 1;
  const root = resolve("dist");
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
  };
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
          new URL(req.url ?? "/", "http://localhost").pathname,
        ),
        file = resolve(root, "." + (path === "/" ? "/index.html" : path));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let data = await readFile(file);
      if (path === "/sw.js")
        data = Buffer.from(
          data.toString() + `\n// verification revision ${revision}`,
        );
      res.writeHead(200, {
        "content-type": types[extname(file)] ?? "application/octet-stream",
        "cache-control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No test server");
  const context = await browser.newContext({ serviceWorkers: "allow" }),
    page = await context.newPage();
  try {
    await page.goto(`http://127.0.0.1:${address.port}/#/plot`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.getByLabel("Y1 expression", { exact: true }).fill("x^3+3");
    revision = 2;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    await expect(
      page.getByRole("button", { name: "Update app", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Y1 expression", { exact: true })).toHaveValue(
      "x^3+3",
    );
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: "Update app", exact: true }).click(),
    ]);
    await expect(page.getByLabel("Y1 expression", { exact: true })).toHaveValue(
      "x^3+3",
    );
  } finally {
    await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
