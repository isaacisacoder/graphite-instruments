import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-pages",
  timeout: 45000,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4181/graphite-instruments/",
    serviceWorkers: "allow",
  },
  webServer: {
    command:
      "npm run preview -- --host 127.0.0.1 --port 4181 --base=/graphite-instruments/",
    url: "http://127.0.0.1:4181/graphite-instruments/",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "pages-chromium",
      use: {
        browserName: "chromium",
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
          : {},
      },
    },
    {
      name: "pages-webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
