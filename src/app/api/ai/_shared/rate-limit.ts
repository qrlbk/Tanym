/**
 * Best-effort per-IP rate limit for AI endpoints. In-memory sliding window.
 *
 * This is NOT a production rate-limit: a Vercel deployment runs multiple
 * serverless instances so each has its own bucket. Treat this as "don't
 * accidentally DDoS your own OpenAI quota during dev" rather than as a
 * security control. For production, swap to Redis/Upstash.
 */

type Window = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Window>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetInMs: number;
};

export function consume(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetInMs: windowMs };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetInMs: existing.resetAt - now,
    };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetInMs: existing.resetAt - now,
  };
}

export function ipFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Convenience wrapper. Returns a 429 Response when over the limit; caller
 * should `return` that response directly.
 */
export function enforceRateLimit(
  req: Request,
  key: string,
  limit: number,
  windowMs: number,
): Response | null {
  const ip = ipFromRequest(req);
  const bucket = consume(`${key}:${ip}`, limit, windowMs);
  if (bucket.ok) return null;
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfterMs: bucket.resetInMs,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(bucket.resetInMs / 1000)),
      },
    },
  );
}
