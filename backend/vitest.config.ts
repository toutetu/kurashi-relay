/// <reference types="vitest/config" />

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "resources/js"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./resources/js/test/setup.ts",
    include: ["resources/js/**/*.{test,spec}.{ts,tsx}"],
  },
});
