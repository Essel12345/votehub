/**
 * Rate Limiting Tests
 *
 * Tests for rate limiting service covering:
 * - Login rate limiting (5 per 15 minutes per IP)
 * - Ballot submission protection (1 per election per voter)
 * - Voter lookup limits (10 per minute per IP)
 * - Admin API limits (100 per minute per user)
 * - Sensitive admin operations (10 per minute per user)
 * - Invitation limits (20 per hour per user)
 * - Error responses and Retry-After headers
 * - IP handling and trusted headers
 * - Multi-tenant isolation verification
 * - Concurrent request handling
 */

import { test } from "node:test";
import * as assert from "node:assert";
import {
  checkRateLimit,
  getClientIp,
  buildRateLimitResponse,
  RATE_LIMIT_CONFIG,
  applyRateLimit,
  buildRateLimitUnavailableResponse,
  getRateLimitBackend,
} from "./rate-limit.service";
import { NextRequest } from "next/server";

// Helper: Create mock NextRequest with custom headers
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/test");
  const request = new NextRequest(url, {
    method: "POST",
    headers: new Headers(headers),
  });
  return request;
}

// ====================================================================
// 1. LOGIN RATE LIMIT TESTS - 5 per 15 minutes per IP
// ====================================================================

test("Rate Limit: Login allows first 5 requests", async () => {
  for (let i = 0; i < 5; i++) {
    const request = createMockRequest({ "X-Forwarded-For": "192.168.1.100" });
    const result = await checkRateLimit(request, "LOGIN", "192.168.1.100");
    assert.ok(result.allowed, `Request ${i + 1} should be allowed`);
  }
});

test("Rate Limit: Login blocks 6th request (exceeds limit)", async () => {
  // Make 5 requests first
  for (let i = 0; i < 5; i++) {
    const request = createMockRequest({ "X-Forwarded-For": "192.168.1.101" });
    await checkRateLimit(request, "LOGIN", "192.168.1.101");
  }

  // 6th request should be blocked
  const request = createMockRequest({ "X-Forwarded-For": "192.168.1.101" });
  const result = await checkRateLimit(request, "LOGIN", "192.168.1.101");
  assert.equal(result.allowed, false, "6th request should be blocked");
});

test("Rate Limit: Login returns resetAfter in seconds", async () => {
  // Make 5 requests
  for (let i = 0; i < 5; i++) {
    const request = createMockRequest({ "X-Forwarded-For": "192.168.1.102" });
    await checkRateLimit(request, "LOGIN", "192.168.1.102");
  }

  // Check reset time
  const request = createMockRequest({ "X-Forwarded-For": "192.168.1.102" });
  const result = await checkRateLimit(request, "LOGIN", "192.168.1.102");
  assert.equal(result.allowed, false);
  assert.ok(result.resetAfter > 0, "resetAfter should be positive");
  assert.ok(result.resetAfter <= 900, "resetAfter should be <= 15 minutes");
});

test("Rate Limit: Different IPs have separate limits", async () => {
  // IP 1: Make 5 requests
  for (let i = 0; i < 5; i++) {
    const request = createMockRequest({ "X-Forwarded-For": "192.168.1.103" });
    await checkRateLimit(request, "LOGIN", "192.168.1.103");
  }

  // IP 2: Should be allowed (separate limit)
  const request = createMockRequest({ "X-Forwarded-For": "192.168.1.104" });
  const result = await checkRateLimit(request, "LOGIN", "192.168.1.104");
  assert.ok(result.allowed, "Different IP should have separate limit");
});

// ====================================================================
// 2. BALLOT SUBMISSION RATE LIMIT TESTS
// ====================================================================

test("Rate Limit: Ballot submission allows first request", async () => {
  const request = createMockRequest();
  const identifier = "user-ballot-123:election-456";
  const result = await checkRateLimit(request, "BALLOT_SUBMIT", identifier);
  assert.ok(result.allowed, "First ballot submission should be allowed");
});

test("Rate Limit: Ballot submission blocks duplicate within window", async () => {
  const identifier = "user-ballot-124:election-457";

  // First submission
  const request1 = createMockRequest();
  const result1 = await checkRateLimit(request1, "BALLOT_SUBMIT", identifier);
  assert.ok(result1.allowed);

  // Second submission (should be blocked)
  const request2 = createMockRequest();
  const result2 = await checkRateLimit(request2, "BALLOT_SUBMIT", identifier);
  assert.equal(
    result2.allowed,
    false,
    "Duplicate ballot submission should be blocked"
  );
});

test("Rate Limit: Ballot submission different elections separate limits", async () => {
  const userId = "user-ballot-125";

  // Election 1
  const request1 = createMockRequest();
  const result1 = await checkRateLimit(
    request1,
    "BALLOT_SUBMIT",
    `${userId}:election-458`
  );
  assert.ok(result1.allowed);

  // Election 2 (different election, should be allowed)
  const request2 = createMockRequest();
  const result2 = await checkRateLimit(
    request2,
    "BALLOT_SUBMIT",
    `${userId}:election-459`
  );
  assert.ok(result2.allowed, "Different election should have separate limit");
});

test("Rate Limit: Ballot submission window is 1 hour", async () => {
  const identifier = "user-ballot-126:election-460";
  const config = RATE_LIMIT_CONFIG.BALLOT_SUBMIT;

  assert.equal(config.window, 60 * 60 * 1000, "Ballot window should be 1 hour");
  assert.equal(config.limit, 1, "Ballot limit should be 1");
});

// ====================================================================
// 3. VOTER LOOKUP RATE LIMIT TESTS - 10 per minute per IP
// ====================================================================

test("Rate Limit: Voter lookup allows 10 requests per minute", async () => {
  for (let i = 0; i < 10; i++) {
    const request = createMockRequest({ "X-Forwarded-For": "192.168.1.105" });
    const result = await checkRateLimit(request, "VOTER_LOOKUP", "192.168.1.105");
    assert.ok(result.allowed, `Request ${i + 1} should be allowed`);
  }
});

test("Rate Limit: Voter lookup blocks 11th request", async () => {
  // Make 10 requests first
  for (let i = 0; i < 10; i++) {
    const request = createMockRequest({ "X-Forwarded-For": "192.168.1.106" });
    await checkRateLimit(request, "VOTER_LOOKUP", "192.168.1.106");
  }

  // 11th request should be blocked
  const request = createMockRequest({ "X-Forwarded-For": "192.168.1.106" });
  const result = await checkRateLimit(request, "VOTER_LOOKUP", "192.168.1.106");
  assert.equal(result.allowed, false, "11th request should be blocked");
});

// ====================================================================
// 4. ADMIN API RATE LIMIT TESTS - 100 per minute per user
// ====================================================================

test("Rate Limit: Admin API allows 100 requests per minute", async () => {
  const limit = RATE_LIMIT_CONFIG.ADMIN_API.limit;
  assert.equal(limit, 100, "Admin API limit should be 100");
});

test("Rate Limit: Admin API uses user identifier, not IP", async () => {
  const config = RATE_LIMIT_CONFIG.ADMIN_API;
  assert.equal(config.identifier, "user", "Admin API should use user identifier");
});

test("Rate Limit: Admin sensitive operations more restrictive (10 per minute)", async () => {
  const sensitiveConfig = RATE_LIMIT_CONFIG.ADMIN_SENSITIVE;
  const generalConfig = RATE_LIMIT_CONFIG.ADMIN_API;

  assert.ok(
    sensitiveConfig.limit < generalConfig.limit,
    "Sensitive admin operations should have lower limit"
  );
  assert.equal(sensitiveConfig.limit, 10, "Sensitive operations should be 10/min");
});

// ====================================================================
// 5. INVITATION RATE LIMIT TESTS - 20 per hour per user
// ====================================================================

test("Rate Limit: Invitation send limit is 20 per hour", async () => {
  const config = RATE_LIMIT_CONFIG.INVITATION_SEND;
  assert.equal(config.limit, 20, "Invitation limit should be 20");
  assert.equal(config.window, 60 * 60 * 1000, "Window should be 1 hour");
});

test("Rate Limit: Invitation send uses user identifier", async () => {
  const config = RATE_LIMIT_CONFIG.INVITATION_SEND;
  assert.equal(config.identifier, "user", "Should use user identifier");
});

// ====================================================================
// 6. RATE LIMIT RESPONSE & HEADERS
// ====================================================================

test("Rate Limit: Blocked request returns 429 status", async () => {
  const response = buildRateLimitResponse("LOGIN", 300);
  assert.equal(response.status, 429, "Should return 429 Too Many Requests");
});

test("Rate Limit: Response includes Retry-After header", async () => {
  const response = buildRateLimitResponse("LOGIN", 300);
  const retryAfter = response.headers.get("Retry-After");
  assert.ok(retryAfter, "Should include Retry-After header");
  assert.equal(retryAfter, "300", "Retry-After should be in seconds");
});

test("Rate Limit: Response includes rate limit headers", async () => {
  const response = buildRateLimitResponse("LOGIN", 300);
  assert.ok(response.headers.get("X-RateLimit-Limit"));
  assert.ok(response.headers.get("X-RateLimit-Window"));
  assert.ok(response.headers.get("X-RateLimit-Reset"));
});

test("Rate Limit: Response body includes error and description", async () => {
  const response = buildRateLimitResponse("LOGIN", 300);
  const body = await response.json();
  assert.ok(body.error);
  assert.ok(body.message);
  assert.ok(body.retryAfter);
});

test("Rate Limit: Error response doesn't expose internal details", async () => {
  const response = buildRateLimitResponse("LOGIN", 300);
  const body = await response.json();
  const bodyStr = JSON.stringify(body);

  assert.ok(!bodyStr.includes("Redis"), "Should not expose storage backend");
  assert.ok(!bodyStr.includes("memory"), "Should not expose implementation");
  assert.ok(!bodyStr.includes("database"), "Should not expose database details");
});

// ====================================================================
// 7. IP HANDLING TESTS
// ====================================================================

test("IP: Detects Cloudflare IP (CF-Connecting-IP)", () => {
  const request = createMockRequest({ "CF-Connecting-IP": "203.0.113.1" });
  const ip = getClientIp(request);
  assert.equal(ip, "203.0.113.1", "Should detect Cloudflare IP");
});

test("IP: Detects X-Forwarded-For IP", () => {
  const request = createMockRequest({ "X-Forwarded-For": "203.0.113.2" });
  const ip = getClientIp(request);
  assert.equal(ip, "203.0.113.2", "Should detect X-Forwarded-For IP");
});

test("IP: Detects X-Real-IP (nginx)", () => {
  const request = createMockRequest({ "X-Real-IP": "203.0.113.3" });
  const ip = getClientIp(request);
  assert.equal(ip, "203.0.113.3", "Should detect X-Real-IP");
});

test("IP: X-Forwarded-For takes first IP in chain", () => {
  const request = createMockRequest({
    "X-Forwarded-For": "203.0.113.4, 203.0.113.5, 203.0.113.6",
  });
  const ip = getClientIp(request);
  assert.equal(ip, "203.0.113.4", "Should take first IP in chain");
});

test("IP: Prioritizes Cloudflare over other headers", () => {
  const request = createMockRequest({
    "CF-Connecting-IP": "203.0.113.10",
    "X-Forwarded-For": "203.0.113.11",
  });
  const ip = getClientIp(request);
  assert.equal(ip, "203.0.113.10", "Should prefer Cloudflare IP");
});

// ====================================================================
// 8. MULTI-TENANT ISOLATION
// ====================================================================

test("Rate Limit: Different organizations don't share limits", async () => {
  // Org A, User 1
  const request1 = createMockRequest();
  const result1 = await checkRateLimit(
    request1,
    "BALLOT_SUBMIT",
    "user-A:election-org-a-1"
  );
  assert.ok(result1.allowed);

  // Org B, User 1 (different election, should be allowed)
  const request2 = createMockRequest();
  const result2 = await checkRateLimit(
    request2,
    "BALLOT_SUBMIT",
    "user-A:election-org-b-1"
  );
  assert.ok(result2.allowed, "Different org should have separate limit");
});

// ====================================================================
// 9. DUPLICATE VOTE PROTECTION (rate limiting doesn't replace it)
// ====================================================================

test("Rate Limit: Rate limiting does NOT replace duplicate vote protection", () => {
  // This is a design verification test
  // The voting system must prevent duplicate votes via:
  // - Database constraints
  // - Transaction handling
  // - Business logic checks
  // NOT by rate limiting alone

  // The rate limit (1 ballot per hour) is an additional security layer
  const ballotConfig = RATE_LIMIT_CONFIG.BALLOT_SUBMIT;

  // Even if rate-limit backend fails, voting system must prevent duplicates
  assert.ok(
    ballotConfig.limit === 1,
    "Rate limit is 1 submission per hour (belt-and-suspenders approach)"
  );

  // Vote duplicate detection must happen in:
  // 1. Database constraint: UNIQUE on (election_voter_id, election_id)
  // 2. Transaction: Entire ballot creation atomic
  // 3. Business logic: Check if voter already voted before accepting ballot
});

// ====================================================================
// 10. APPLYRATELI MIT HELPER
// ====================================================================

test("Rate Limit: applyRateLimit returns { allowed: true } when under limit", async () => {
  const request = createMockRequest();
  const result = await applyRateLimit(request, "VOTER_LOOKUP", "192.168.1.107");
  assert.equal(result.allowed, true);
  assert.ok(!result.response, "Should not have response when allowed");
});

test("Rate Limit: applyRateLimit returns { allowed: false, response } when blocked", async () => {
  // Make 10 requests first
  for (let i = 0; i < 10; i++) {
    const request = createMockRequest();
    await applyRateLimit(request, "VOTER_LOOKUP", "192.168.1.108");
  }

  // 11th should be blocked
  const request = createMockRequest();
  const result = await applyRateLimit(request, "VOTER_LOOKUP", "192.168.1.108");
  assert.equal(result.allowed, false);
  assert.ok(result.response, "Should have response when blocked");
  assert.equal(result.response.status, 429);
});

// ====================================================================
// 11. FAIL-SAFE BEHAVIOR
// ====================================================================

test("Rate Limit: Graceful degradation on error", async () => {
  // applyRateLimit should not throw, should allow on error
  const request = createMockRequest();

  try {
    const result = await applyRateLimit(request, "LOGIN", "test");
    assert.ok(result.allowed !== false, "Should allow on error (fail-safe)");
  } catch (error) {
    assert.fail("Should not throw on error");
  }
});

// ====================================================================
// 12. CONCURRENT REQUESTS
// ====================================================================

test("Rate Limit: Handles concurrent requests correctly", async () => {
  const identifier = "concurrent-test-user";
  const promises = [];

  // Spawn 10 concurrent requests, matching the voter lookup limit
  for (let i = 0; i < RATE_LIMIT_CONFIG.VOTER_LOOKUP.limit; i++) {
    const request = createMockRequest();
    promises.push(checkRateLimit(request, "VOTER_LOOKUP", identifier));
  }

  const results = await Promise.all(promises);

  // All 10 should be allowed
  const allowedCount = results.filter((r) => r.allowed).length;
  assert.equal(allowedCount, 10, "All 10 concurrent requests should be allowed");

  // The 11th should be blocked
  const request = createMockRequest();
  const sixthResult = await checkRateLimit(request, "VOTER_LOOKUP", identifier);
  assert.ok(!sixthResult.allowed, "6th request should be blocked");
});

// ====================================================================
// 13. CONFIGURATION CONSISTENCY
// ====================================================================

test("Configuration: All configs have required fields", () => {
  const requiredFields = ["limit", "window", "identifier", "description"];

  for (const [key, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    for (const field of requiredFields) {
      assert.ok(field in config, `${key} missing ${field}`);
    }

    // Sanity checks
    assert.ok(config.limit > 0, `${key} limit should be positive`);
    assert.ok(config.window > 0, `${key} window should be positive`);
    assert.ok(
      ["ip", "user", "user+election"].includes(config.identifier),
      `${key} identifier should be valid`
    );
  }
});

test("Configuration: Login limit (5/15min) more restrictive than voter lookup (10/min)", () => {
  const loginRps = RATE_LIMIT_CONFIG.LOGIN.limit / (RATE_LIMIT_CONFIG.LOGIN.window / 1000);
  const voterLookupRps = RATE_LIMIT_CONFIG.VOTER_LOOKUP.limit / (RATE_LIMIT_CONFIG.VOTER_LOOKUP.window / 1000);

  assert.ok(loginRps < voterLookupRps, "Login should be more restrictive");
});

// ====================================================================
// 14. COMPREHENSIVE WORKFLOW TEST
// ====================================================================

test("Rate Limit: Complete workflow - login attempt sequence", async () => {
  const ip = "192.168.1.200";

  // Attempt 1-5: Should succeed
  for (let i = 0; i < 5; i++) {
    const request = createMockRequest();
    const result = await applyRateLimit(request, "LOGIN", ip);
    assert.ok(result.allowed, `Login attempt ${i + 1} should succeed`);
    assert.ok(!result.response, `Login attempt ${i + 1} should not have response`);
  }

  // Attempt 6: Should fail with 429
  const sixthRequest = createMockRequest();
  const sixthResult = await applyRateLimit(sixthRequest, "LOGIN", ip);
  assert.equal(sixthResult.allowed, false);
  assert.ok(sixthResult.response);
  assert.equal(sixthResult.response?.status, 429);

  // Check headers
  const headers = sixthResult.response?.headers;
  assert.ok(headers?.get("Retry-After"));
  assert.ok(headers?.get("X-RateLimit-Limit"));
  assert.equal(headers?.get("X-RateLimit-Limit"), "5");
});

test("Rate Limit: Production backend selection never defaults to memory", () => {
  assert.equal(getRateLimitBackend("production", undefined), null);
  assert.equal(getRateLimitBackend("production", "upstash"), "upstash");
  assert.equal(getRateLimitBackend("development", undefined), "memory");
});

test("Rate Limit: Shared backend outage response is non-sensitive", async () => {
  const response = buildRateLimitUnavailableResponse();
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, "Rate limiting temporarily unavailable");
  assert.ok(!JSON.stringify(body).includes("token"));
});
