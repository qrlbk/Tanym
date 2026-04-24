import { test, expect } from "@playwright/test";

test.describe("Tanym smoke", () => {
  test("loads editor shell", async ({ page }) => {
    await page.goto("/");
    const welcomeHeading = page.getByRole("heading", { name: "Tanym" });
    if (await welcomeHeading.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /Создать новый проект/ }).click();
    }
    await expect(page.locator('[role="tablist"][aria-label="Лента команд"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("text=Главная").first()).toBeVisible();
  });

  test("opens graph workspace and returns to scene", async ({ page }) => {
    await page.goto("/");
    const welcomeHeading = page.getByRole("heading", { name: "Tanym" });
    if (await welcomeHeading.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /Создать новый проект/ }).click();
    }

    const storyMemoryToggle = page.getByRole("button", { name: /Story Memory/i }).first();
    await storyMemoryToggle.click();
    await page.getByRole("button", { name: "Graph" }).click();
    await expect(page.getByText("Story Graph Workspace")).toBeVisible();

    await page.getByRole("button", { name: "Конфликты" }).click();
    await expect(page.getByText("Story Graph Workspace")).toHaveCount(0);
  });
});
