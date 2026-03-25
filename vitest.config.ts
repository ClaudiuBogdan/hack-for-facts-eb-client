/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { lingui } from "@lingui/vite-plugin";
import path from "path";

export default defineConfig({
  plugins: [
    lingui(),
    react(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    unstubGlobals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    maxWorkers: 2,
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/setup.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@lingui/core/macro": path.resolve(
        __dirname,
        "./src/test/mocks/lingui-core-macro.ts"
      ),
      "@lingui/react/macro": path.resolve(
        __dirname,
        "./src/test/mocks/lingui-react-macro.tsx"
      ),
      "@lingui/core": path.resolve(
        __dirname,
        "./src/test/mocks/lingui-core.ts"
      ),
      "@lingui/react": path.resolve(
        __dirname,
        "./src/test/mocks/lingui-react.tsx"
      ),
    },
  },
});
