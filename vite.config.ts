import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
const base = process.env.GRAPHITE_BASE_PATH ?? "/";
if (!base.startsWith("/") || !base.endsWith("/"))
  throw Error("GRAPHITE_BASE_PATH must start and end with a slash");
export default defineConfig({
  base,
  worker: { format: "es" },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      manifest: {
        name: "Graphite Math Instruments",
        short_name: "Graphite",
        description: "Local math instruments and graph workspace",
        theme_color: "#303530",
        background_color: "#eef0e8",
        display: "standalone",
        start_url: "./#/",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2,ttf}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3000000,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: { output: { manualChunks: { math: ["mathjs/number"] } } },
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
