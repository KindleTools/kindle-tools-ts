import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [],

  root: resolve(__dirname, "src/gui"),
  publicDir: resolve(__dirname, "src/gui/public"),

  resolve: {
    alias: {
      "@": resolve(__dirname, "src/gui"),
      "#core": resolve(__dirname, "src/core"),
      "#utils": resolve(__dirname, "src/utils"),
      "#types": resolve(__dirname, "src/types"),
    },
  },

  build: {
    outDir: resolve(__dirname, "dist-gui"),
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
