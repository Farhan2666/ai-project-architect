import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;
const CLEANUP_INTERVAL = 30_000;

interface CacheEntry {
  count: number;
  resetAt: number;
}

class AutoCleanupCache {
  private cache = new Map<string, CacheEntry>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.timer = setInterval(() => this.evict(), CLEANUP_INTERVAL);
    if (this.timer && typeof this.timer === "object") {
      this.timer.unref();
    }
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.resetAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry);
  }

  private evict(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.resetAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.cache.clear();
  }
}

const memoryCache = new AutoCleanupCache();

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
      // fallback to in-memory
    }
  }

  const now = Date.now();
  const entry = memoryCache.get(key);
  if (!entry) {
    memoryCache.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining };
}
