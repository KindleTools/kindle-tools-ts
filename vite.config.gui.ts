import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [],
  root: resolve(__dirname, "src/gui"),
  publicDir: resolve(__dirname, "src/gui/public"),
  build: {
    outDir: resolve(__dirname, "dist-gui"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ["date-fns"],
  },
});
