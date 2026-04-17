import { defineConfig, devices } from "@playwright/test";

/**
 * Минимальный e2e-скаффолд. См. docs/DEVELOPMENT.md → «Инфраструктура качества».
 * Запускается командой `npm run e2e` после `npm install`.
 *
 * Цель сценариев фазы 2:
 *   1) smoke — страница грузится, редактор виден
 *   2) открыть проект → создать сцену → ввести текст → автосохранение
 *   3) запросить AI quick-command → увидеть streaming
 *   4) применить AI-правку к документу → undo
 *   5) экспорт DOCX — файл скачался
 *
 * Сейчас реализован только (1). Остальные — заглушки в e2e/ (TODO).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3010",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3010",
    url: "http://localhost:3010",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Ключи AI не нужны для smoke; API-роуты вернут 503 — это ок.
    env: {
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GOOGLE_GENERATIVE_AI_API_KEY: "",
    },
  },
});
