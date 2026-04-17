/**
 * Tiny promise-based semaphore. Used to cap concurrency on calls to expensive
 * endpoints (embeddings, plot-extract). Identical semantics to p-limit but
 * small enough to avoid a dependency.
 */

export type Semaphore = {
  <T>(fn: () => Promise<T>): Promise<T>;
  readonly pending: number;
  readonly active: number;
  readonly limit: number;
};

export function createSemaphore(limit: number): Semaphore {
  if (limit < 1 || !Number.isFinite(limit)) {
    throw new Error("Semaphore limit must be a positive number");
  }

  const queue: Array<() => void> = [];
  let active = 0;

  const next = () => {
    if (active >= limit) return;
    const task = queue.shift();
    if (!task) return;
    task();
  };

  const runner = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active += 1;
    try {
      return await fn();
    } finally {
      active -= 1;
      next();
    }
  };

  return Object.defineProperties(runner as Semaphore, {
    pending: { get: () => queue.length },
    active: { get: () => active },
    limit: { value: limit, writable: false },
  });
}
