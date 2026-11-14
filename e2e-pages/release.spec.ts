import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("Pages assets, calculation, legal pages and offline worker scope", async ({
  page,
  context,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.url() + ": " + r.status());
  });
  await page.goto("./#/basic");
  const input = page.getByLabel("Expression", { exact: true });
  await input.fill("2+3*4");
  await input.press("Enter");
  await expect(page.locator(".lite-display output")).toHaveText("14");
  await expect(page.locator(".release-footer a").first()).toHaveAttribute(
    "href",
    "/graphite-instruments/legal/privacy.html",
  );
  const manifest = await (await request.get("./manifest.webmanifest")).json();
  expect(manifest.scope).toBe("./");
  expect(manifest.icons[0].src).toBe("icon-192.png");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL),
  ).toContain("/graphite-instruments/sw.js");
  await context.setOffline(true);
  await page.goto("./#/cas");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator(".tool-output dl")).toBeVisible();
  await context.setOffline(false);
  for (const slug of ["privacy", "terms", "disclaimer", "about"]) {
    await page.goto("./legal/" + slug + ".html");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  for (const file of ["license.txt", "notices.txt"]) {
    const response = await request.get("./legal/" + file);
    expect(response.ok()).toBe(true);
    expect((await response.text()).length).toBeGreaterThan(1000);
  }
  expect(errors).toEqual([]);
});
