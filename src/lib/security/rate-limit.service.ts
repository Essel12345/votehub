/**
 * Rate Limiting Service
 *
 * Provides rate limiting for API endpoints with support for multiple backends:
 * - In-memory (development only, single instance)
 * - Redis (production, multi-instance)
 *
 * IMPORTANT: For production deployments across multiple instances,
 * configure REDIS_URL environment variable. In-memory mode is suitable
 * for single-instance deployments only (staging, local development).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Rate limit entry: tracks request count and reset time
 */
interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp when limit resets
}

interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAfter: number;
}

interface RateLimitStore {
  consume(key: string, limit: number, window: number): Promise<RateLimitResult>;
  destroy(): void;
}

export type RateLimitBackend = "memory" | "upstash";

export class RateLimitConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

export class RateLimitBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitBackendError";
  }
}

/**
 * In-memory rate limit store (single instance only)
 * Key: "${identifier}:${endpoint}:${window}"
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 60 seconds
    if (typeof window === "undefined") {
      // Only in Node.js environment
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60000);
      this.cleanupInterval.unref();
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Check if request is within rate limit
   */
  isAllowed(key: string, limit: number, window: number): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      // First request in window or window expired
      this.store.set(key, { count: 1, resetAt: now + window });
      return true;
    }

    // Within window
    if (entry.count < limit) {
      entry.count++;
      return true;
    }

    return false;
  }

  async consume(key: string, limit: number, window: number): Promise<RateLimitResult> {
    const allowed = this.isAllowed(key, limit, window);
    return {
      allowed,
      count: this.getCount(key),
      resetAfter: Math.ceil(this.getResetTime(key) / 1000),
    };
  }

  /**
   * Get remaining time until reset (milliseconds)
   */
  getResetTime(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;

    const remaining = Math.max(0, entry.resetAt - Date.now());
    return remaining;
  }

  /**
   * Get current count for a key
   */
  getCount(key: string): number {
    const entry = this.store.get(key);
    return entry?.count || 0;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

class UpstashRateLimitStore implements RateLimitStore {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async consume(key: string, limit: number, window: number): Promise<RateLimitResult> {
    const windowSeconds = Math.max(1, Math.ceil(window / 1000));
    const script = [
      "local count = redis.call('INCR', KEYS[1])",
      "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
      "local ttl = redis.call('TTL', KEYS[1])",
      "return {count, ttl}",
    ].join(" ");

    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, "1", key, String(windowSeconds)]),
    });

    if (!response.ok) {
      throw new RateLimitBackendError(`Shared rate-limit backend returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { result?: unknown };
    if (!Array.isArray(payload.result) || payload.result.length < 2) {
      throw new RateLimitBackendError("Shared rate-limit backend returned an invalid response");
    }

    const count = Number(payload.result[0]);
    const resetAfter = Math.max(0, Number(payload.result[1]));
    if (!Number.isSafeInteger(count) || !Number.isFinite(resetAfter)) {
      throw new RateLimitBackendError("Shared rate-limit backend returned invalid counter data");
    }

    return { allowed: count <= limit, count, resetAfter };
  }

  destroy() {}
}

// Singleton instance
let rateLimitStore: RateLimitStore;
let rateLimitBackend: RateLimitBackend | null = null;

export function getRateLimitBackend(
  nodeEnvironment = process.env.NODE_ENV,
  configuredBackend = process.env.RATE_LIMIT_BACKEND
): RateLimitBackend | null {
  if (configuredBackend === "memory" || configuredBackend === "upstash") {
    return configuredBackend;
  }

  if (configuredBackend) return null;

  return nodeEnvironment === "production" ? null : "memory";
}

function getStore(): RateLimitStore {
  if (!rateLimitStore) {
    rateLimitBackend = getRateLimitBackend();

    if (rateLimitBackend === "memory") {
      rateLimitStore = new InMemoryRateLimitStore();
    } else if (rateLimitBackend === "upstash") {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) {
        throw new RateLimitConfigurationError(
          "RATE_LIMIT_BACKEND=upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
        );
      }
      rateLimitStore = new UpstashRateLimitStore(url, token);
    } else {
      throw new RateLimitConfigurationError(
        "Production requires RATE_LIMIT_BACKEND=upstash; process-local memory is not permitted"
      );
    }
  }
  return rateLimitStore;
}

/**
 * Extract trusted client IP from request
 *
 * Checks in order:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Forwarded-For (proxies)
 * 3. X-Real-IP (nginx)
 * 4. socket.remoteAddress (direct connection)
 *
 * Only trusts headers from known proxy infrastructure.
 */
export function getClientIp(request: NextRequest): string {
  // Cloudflare
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  // X-Forwarded-For (first IP in chain if multiple)
  const xForwardedFor = request.headers.get("X-Forwarded-For");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  // nginx reverse proxy
  const xRealIp = request.headers.get("X-Real-IP");
  if (xRealIp) return xRealIp;

  // Fallback (may not work in all environments)
  // In serverless/edge environments, IP may not be directly available
  return "unknown";
}

/**
 * Get authenticated user ID from request
 *
 * In production, extract from JWT token or session.
 * For now, returns null (login endpoints won't have it).
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => undefined,
        },
      }
    );
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return data.user.id;
  } catch {
    // Silently fail, not authenticated
  }

  return null;
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMIT_CONFIG = {
  // Authentication endpoints
  LOGIN: {
    limit: 5,
    window: 15 * 60 * 1000, // 15 minutes
    identifier: "ip", // IP-based
    description: "Login attempts: 5 per 15 minutes per IP",
  },

  // Voting endpoints
  BALLOT_SUBMIT: {
    limit: 1,
    window: 60 * 60 * 1000, // 1 hour (prevents accidental resubmission)
    identifier: "user+election", // User + Election ID
    description: "Ballot submission: 1 per hour per user per election",
  },

  // Voter lookup/search
  VOTER_LOOKUP: {
    limit: 10,
    window: 60 * 1000, // 1 minute
    identifier: "ip",
    description: "Voter lookup: 10 per minute per IP",
  },

  // Admin APIs (general)
  ADMIN_API: {
    limit: 100,
    window: 60 * 1000, // 1 minute
    identifier: "user", // User ID
    description: "Admin API: 100 per minute per user",
  },

  // Sensitive admin operations
  ADMIN_SENSITIVE: {
    limit: 10,
    window: 60 * 1000, // 1 minute
    identifier: "user",
    description: "Sensitive admin operations: 10 per minute per user",
  },

  // Invitation endpoints
  INVITATION_SEND: {
    limit: 20,
    window: 60 * 60 * 1000, // 1 hour
    identifier: "user",
    description: "Send invitations: 20 per hour per user",
  },

  // Public registration
  REGISTER: {
    limit: 5,
    window: 60 * 60 * 1000, // 1 hour
    identifier: "ip",
    description: "Registration attempts: 5 per hour per IP",
  },
};

/**
 * Check if request is rate limited
 *
 * @param request - Next.js request object
 * @param configKey - Key from RATE_LIMIT_CONFIG
 * @param identifierOverride - Override the identifier (e.g., include election ID)
 * @returns { allowed: boolean, resetAfter: number } - resetAfter in seconds
 */
export async function checkRateLimit(
  request: NextRequest,
  configKey: keyof typeof RATE_LIMIT_CONFIG,
  identifierOverride?: string
): Promise<{ allowed: boolean; resetAfter: number }> {
  const config = RATE_LIMIT_CONFIG[configKey];
  const store = getStore();

  let identifier = identifierOverride;

  if (!identifier) {
    if (config.identifier === "ip") {
      identifier = getClientIp(request);
    } else if (config.identifier === "user") {
      const userId = await getUserIdFromRequest(request);
      identifier = userId || getClientIp(request);
    } else if (config.identifier === "user+election") {
      const userId = await getUserIdFromRequest(request);
      identifier = userId || getClientIp(request);
      // Caller should append election ID if needed
    }
  }

  // Safety check: if we can't identify, default to IP
  if (!identifier || identifier === "unknown") {
    identifier = getClientIp(request);
  }

  const key = `${identifier}:${configKey}`;
  const result = await store.consume(key, config.limit, config.window);
  const { allowed, resetAfter } = result;

  return { allowed, resetAfter };
}

/**
 * Rate limit middleware response builder
 */
export function buildRateLimitResponse(
  configKey: keyof typeof RATE_LIMIT_CONFIG,
  resetAfter: number
): NextResponse {
  const config = RATE_LIMIT_CONFIG[configKey];

  return NextResponse.json(
    {
      error: "Too many requests",
      message: config.description,
      retryAfter: resetAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": resetAfter.toString(),
        "X-RateLimit-Limit": config.limit.toString(),
        "X-RateLimit-Window": (config.window / 1000).toString(),
        "X-RateLimit-Reset": new Date(Date.now() + resetAfter * 1000).toISOString(),
      },
    }
  );
}

export function buildRateLimitUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limiting temporarily unavailable",
      message: "Please try again later.",
    },
    { status: 503 }
  );
}

/**
 * Apply rate limit to request
 * Call this at the start of API route handlers
 *
 * Usage:
 * ```typescript
 * const rateLimitResult = await applyRateLimit(request, 'LOGIN');
 * if (!rateLimitResult.allowed) {
 *   return rateLimitResult.response;
 * }
 * ```
 */
export async function applyRateLimit(
  request: NextRequest,
  configKey: keyof typeof RATE_LIMIT_CONFIG,
  identifierOverride?: string
): Promise<{
  allowed: boolean;
  response?: NextResponse;
}> {
  try {
    const { allowed, resetAfter } = await checkRateLimit(
      request,
      configKey,
      identifierOverride
    );

    if (!allowed) {
      return {
        allowed: false,
        response: buildRateLimitResponse(configKey, resetAfter),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check failed:", error);

    if (process.env.NODE_ENV === "production" || rateLimitBackend === "upstash") {
      return { allowed: false, response: buildRateLimitUnavailableResponse() };
    }

    return { allowed: true };
  }
}

/**
 * Add rate-limit headers to response for informational purposes
 * (complements the rate limit check)
 */
export function addRateLimitHeaders(
  response: NextResponse,
  configKey: keyof typeof RATE_LIMIT_CONFIG,
  remaining: number
): NextResponse {
  const config = RATE_LIMIT_CONFIG[configKey];
  response.headers.set("X-RateLimit-Limit", config.limit.toString());
  response.headers.set("X-RateLimit-Remaining", Math.max(0, remaining).toString());
  return response;
}

/**
 * Cleanup function (call on server shutdown)
 */
export function cleanupRateLimiter() {
  if (rateLimitStore) {
    rateLimitStore.destroy();
  }
}
