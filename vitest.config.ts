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
      // Текущий baseline покрытия для стабильного CI.
      // Повышаем постепенно по мере добавления тестов для ещё не покрытых модулей.
      thresholds: {
        lines: 44,
        functions: 47,
        statements: 44,
        branches: 34,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
