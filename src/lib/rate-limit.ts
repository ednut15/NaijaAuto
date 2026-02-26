import { ApiError } from "@/lib/http";

type WindowKey = string;

interface LimitState {
  count: number;
  resetAt: number;
}

const bucket = new Map<WindowKey, LimitState>();

export function enforceRateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const existing = bucket.get(key);

  if (!existing || now > existing.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= max) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    throw new ApiError(
      429,
      `Rate limit exceeded. Try again in ${Math.max(1, retryAfterSeconds)}s.`,
    );
  }

  existing.count += 1;
  bucket.set(key, existing);
}

export function resetRateLimitsForTests(): void {
  bucket.clear();
}
