import { NextResponse } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

declare global {
  var __arcadeRateLimitStore: Map<string, RateLimitState> | undefined;
}

const store = globalThis.__arcadeRateLimitStore ?? new Map<string, RateLimitState>();

if (!globalThis.__arcadeRateLimitStore) {
  globalThis.__arcadeRateLimitStore = store;
}

function cleanupExpiredEntries(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function enforceRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: Math.max(limit - 1, 0),
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterMs: current.resetAt - now,
      remaining: 0,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(limit - current.count, 0),
  };
}

export function createRateLimitResponse(
  message = "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
  retryAfterMs = 60_000,
) {
  const retryAfterSeconds = Math.max(Math.ceil(retryAfterMs / 1000), 1);

  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
