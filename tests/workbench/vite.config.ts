import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const Dirname = dirname(fileURLToPath(import.meta.url));

// Base path for GitHub Pages
const BASE_PATH = process.env.GITHUB_ACTIONS ? "/kindle-tools-ts/" : "/";

export default defineConfig({
  base: BASE_PATH,
  plugins: [],

  root: Dirname,
  publicDir: resolve(Dirname, "public"),

  resolve: {
    alias: {
      "@": Dirname,
      "#core": resolve(Dirname, "../../src/core"),
      "#utils": resolve(Dirname, "../../src/utils"),
      "#types": resolve(Dirname, "../../src/types"),
    },
  },

  build: {
    outDir: resolve(Dirname, "../../dist-gui"),
    emptyOutDir: true,

    // Modern target for better performance
    target: "esnext",

    // Minify with esbuild (faster than terser)
    minify: "esbuild",

    // No sourcemaps for production GUI
    sourcemap: false,

    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,

    // Rollup options for optimization
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("date-fns")) {
              return "date-vendor";
            }
            return "vendor";
          }
          if (id.includes("/src/core/") || id.includes("/src/utils/")) {
            return "kindle-core";
          }
        },

        // Asset file names
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
      },
    },
  },

  server: {
    port: 3000,
    strictPort: false,
    open: true,
    host: true,

    // HMR configuration
    hmr: {
      overlay: true,
    },
  },

  preview: {
    port: 3000,
    strictPort: false,
    open: true,
    host: true,
  },

  optimizeDeps: {
    include: ["date-fns"],
  },

  // CSS options
  css: {
    devSourcemap: true,
  },
});
