import { describe, expect, it } from "vitest";
import { createSemaphore } from "./semaphore";

describe("semaphore", () => {
  it("caps concurrent execution at the limit", async () => {
    const sem = createSemaphore(2);
    let active = 0;
    let peak = 0;
    const work = async (ms: number) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, ms));
      active -= 1;
    };
    await Promise.all(
      [5, 5, 5, 5, 5].map((ms) => sem(() => work(ms))),
    );
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("forwards return values and errors", async () => {
    const sem = createSemaphore(1);
    const value = await sem(async () => 42);
    expect(value).toBe(42);
    await expect(
      sem(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
