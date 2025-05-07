import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import checker from "vite-plugin-checker";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    checker({
      typescript: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ["pyodide"],
  },
  build: {
    rollupOptions: {
      external: ["pyodide"],
    },
  },
  // Configure Pyodide assets to be served from CDN
  define: {
    "process.env.PYODIDE_CDN_URL": JSON.stringify(
      "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
    ),
  },
});
