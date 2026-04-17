import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/lib/ai/**",
        "src/lib/plot-index/**",
        "src/lib/layout/**",
        "src/lib/project/**",
        "src/lib/story/**",
        "src/lib/page-layout-engine/**",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
      ],
      // Core логика — хотя бы 60% на критическом пути.
      // См. docs/DEVELOPMENT.md → «Инфраструктура качества».
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 55,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
