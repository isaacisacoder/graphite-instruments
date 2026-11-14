import { test, expect } from "@playwright/test";
test.use({ serviceWorkers: "allow" });
test("all instruments and workers load offline after the initial cache", async ({
  page,
  context,
}) => {
  await page.goto("/#/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  for (const route of [
    "basic",
    "scientific",
    "graphing",
    "financial",
    "cas",
    "calculus",
    "statistics",
    "matrix",
    "discrete",
    "surface",
    "plot",
  ]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Unable to open this instrument" }),
    ).toHaveCount(0);
  }
  await page.goto("/#/cas");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator(".tool-output dl")).toBeVisible();
  await page.reload();
  await expect(page.locator(".tool-output dl")).toBeVisible();
  await context.setOffline(false);
});
