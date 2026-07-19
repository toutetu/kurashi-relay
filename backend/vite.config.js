import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "../frontend");

export default defineConfig({
  root: frontendRoot,
  plugins: [
    laravel({
      publicDirectory: path.resolve(__dirname, "public"),
      buildDirectory: "build",
      input: [path.resolve(frontendRoot, "src/inertia/app.tsx")],
      refresh: [
        path.resolve(__dirname, "routes/**"),
        path.resolve(__dirname, "app/Http/**"),
        path.resolve(frontendRoot, "src/inertia/**"),
      ],
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(frontendRoot, "src"),
    },
  },
});
