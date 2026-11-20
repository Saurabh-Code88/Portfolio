import { createHash } from "node:crypto";
import { ASK_LIMITS } from "./ask-config.ts";

export interface RateLimiter {
  limit(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();
  private readonly max: number;
  private readonly windowSeconds: number;
  constructor(max = ASK_LIMITS.requestsPerWindow, windowSeconds = ASK_LIMITS.windowSeconds) {
    this.max = max;
    this.windowSeconds = windowSeconds;
  }

  async limit(key: string) {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.entries.set(key, { count: 1, expiresAt: now + this.windowSeconds * 1000 });
      return { allowed: true, retryAfterSeconds: this.windowSeconds };
    }
    entry.count += 1;
    return { allowed: entry.count <= this.max, retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)) };
  }
}

export class UpstashRateLimiter implements RateLimiter {
  private readonly url: string;
  private readonly token: string;
  private readonly max: number;
  private readonly windowSeconds: number;
  constructor(url: string, token: string, max = ASK_LIMITS.requestsPerWindow, windowSeconds = ASK_LIMITS.windowSeconds) {
    this.url = url;
    this.token = token;
    this.max = max;
    this.windowSeconds = windowSeconds;
  }

  async limit(key: string) {
    const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return {n,redis.call('TTL',KEYS[1])}";
    const response = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", script, "1", `portfolio:ask:${key}`, String(this.windowSeconds)]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Rate limit backend unavailable");
    const result = (await response.json()) as { result?: [number, number] };
    if (!Array.isArray(result.result) || result.result.length < 2) throw new Error("Rate limit backend unavailable");
    return { allowed: result.result[0] <= this.max, retryAfterSeconds: Math.max(1, result.result[1]) };
  }
}

export class UnavailableRateLimiter implements RateLimiter {
  async limit(): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    throw new Error("Rate limit backend unavailable");
  }
}

export function createRateLimiter(): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new UpstashRateLimiter(url, token);
  if (process.env.NODE_ENV === "development") return new MemoryRateLimiter();
  return new UnavailableRateLimiter();
}
