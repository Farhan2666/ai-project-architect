import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

const memoryMap = new Map<string, { count: number; resetAt: number }>();

let upstashRatelimit: Ratelimit | null = null;

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (upstashUrl && upstashToken) {
  try {
    const redis = new Redis({ url: upstashUrl, token: upstashToken });
    upstashRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, `${RATE_LIMIT_WINDOW}ms`),
      analytics: true,
      prefix: "ai-project-architect",
    });
  } catch {
    upstashRatelimit = null;
  }
}

export async function rateLimit(
  key: string,
): Promise<{ allowed: boolean; remaining: number }> {
  if (upstashRatelimit) {
    try {
      const result = await upstashRatelimit.limit(key);
      return { allowed: result.success, remaining: result.remaining };
    } catch {
      // fallback ke in-memory
    }
  }

  const now = Date.now();
  const entry = memoryMap.get(key);
  if (!entry || now > entry.resetAt) {
    memoryMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining };
}
