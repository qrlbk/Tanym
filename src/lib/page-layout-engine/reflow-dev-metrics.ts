/**
 * Dev-only: счётчик вызовов runPageLayout (baseline для оптимизаций).
 * Включить: `localStorage.setItem('DEBUG_REFLOW','1')`, обновить страницу.
 */
let bucket = 0;
let intervalStarted = false;

export function recordReflowLayoutCall(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("DEBUG_REFLOW") !== "1") return;
  bucket++;
  if (intervalStarted) return;
  intervalStarted = true;
  setInterval(() => {
    if (bucket > 0) {
      console.debug(
        `[reflow] runPageLayout ~${bucket} calls in last 1s (localStorage.removeItem('DEBUG_REFLOW') to disable)`,
      );
      bucket = 0;
    }
  }, 1000);
}
