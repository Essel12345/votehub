# Phase 15 Rate Limiter Diagnosis

**Date:** 2026-08-22
**Endpoint:** `POST /api/auth/register`
**Deployment changes:** None

## 1. Rate Limiter Provider

The production provider is Upstash Redis over its REST API. VoteHub does not use an Upstash npm package: `UpstashRateLimitStore` calls the configured REST URL with `fetch`, sends the bearer token, and executes an atomic Redis `EVAL` script for the counter and TTL.

Local development may use the process-local in-memory store, but production is explicitly prohibited from using it.

## 2. Source Files

- `app/api/auth/register/route.ts` imports `applyRateLimit` and calls `await applyRateLimit(request, "REGISTER")` before parsing the registration body.
- `src/lib/security/rate-limit.service.ts` implements backend selection, the in-memory store, the Upstash REST store, error handling, and the `REGISTER` limit.
- `.env.example` documents the backend variable names but contains no real values.
- `docs/STAGING_ENVIRONMENT_STATUS.md` records the staging rate-limit variables as missing.

The registration limit is 5 requests per hour per client IP. A normal limit violation returns HTTP 429; the reported HTTP 503 is the backend-unavailable path, not an ordinary rate-limit rejection.

## 3. Required Environment Variable Names

| Variable | Required | Server-side | Current detection/status |
|---|---|---|---|
| `RATE_LIMIT_BACKEND` | Yes in production; must be `upstash` | Yes | Repository staging status: missing; local shell presence was detected during inspection, but its value was never printed |
| `UPSTASH_REDIS_REST_URL` | Yes when `RATE_LIMIT_BACKEND=upstash` | Yes | Repository staging status: missing; no value was printed |
| `UPSTASH_REDIS_REST_TOKEN` | Yes when `RATE_LIMIT_BACKEND=upstash` | Yes, secret | Repository staging status: missing; no value was printed |
| `NODE_ENV` | Controls production fail-closed behavior | Server runtime | Local shell: configured; Vercel runs production behavior |

No `REDIS_URL`, `SUPABASE` rate-limit table, or client-side variable is used by the active implementation. The `REDIS_URL` references in older documentation do not match the current service code.

## 4. Current Staging Configuration Status

The repository's staging status document lists `RATE_LIMIT_BACKEND`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` as missing. Vercel environment values cannot be read from this workspace, so their actual remote values were not exposed or independently inspected.

The deployed 503 is consistent with missing production backend configuration. If Vercel has `RATE_LIMIT_BACKEND=upstash`, the same public 503 can instead result from missing Upstash URL/token, an Upstash non-2xx response, a network failure, or an invalid backend response. The response body intentionally does not identify which internal failure occurred.

## 5. Exact Reason for HTTP 503

The registration route calls `applyRateLimit` before registration:

```ts
const rateLimitResult = await applyRateLimit(request, "REGISTER");
if (!rateLimitResult.allowed) {
  return rateLimitResult.response!;
}
```

`applyRateLimit` catches any error from `checkRateLimit`. It returns the 503 response when either:

```ts
process.env.NODE_ENV === "production" || rateLimitBackend === "upstash"
```

is true. In Vercel production mode, that condition is true for every rate-limit configuration or backend failure.

With production and no `RATE_LIMIT_BACKEND`, `getRateLimitBackend()` returns `null`; `getStore()` then throws:

```text
Production requires RATE_LIMIT_BACKEND=upstash; process-local memory is not permitted
```

The catch converts that configuration error to:

```json
{
  "error": "Rate limiting temporarily unavailable",
  "message": "Please try again later."
}
```

Therefore, the exact application-level cause of the 503 is a rate-limit initialization or backend-consumption exception handled by the production fail-closed branch. The available response alone cannot distinguish missing variables from an unavailable/misconfigured Upstash service; Vercel logs would be needed to identify the precise underlying exception without exposing secrets.

## 6. Minimal Secure Fix

Configure the existing Upstash backend in Vercel Preview using server-only variables:

```text
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=https://<database>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<server-only-token>
```

Verify the URL and token belong to the same Upstash database, then redeploy the Preview so the server function receives the values. Confirm a successful below-limit registration attempt and that later excess requests return 429. Do not place the token in any `NEXT_PUBLIC_*` variable or source file.

## 7. Whether Vercel Preview Variables Need to Be Added

Yes, based on the repository's recorded staging status and the reported production 503, the three server-only variables need to be added or corrected in the Vercel Preview environment. The actual remote values remain uninspected. Do not use `memory` in Vercel production mode.

## 8. Whether Code Changes Are Required

No code changes are required to resolve the diagnosed configuration failure. Rate limiting must remain enabled and fail closed in production. Do not bypass it, replace it with an in-memory store in production, modify the registration schema, modify Supabase Auth, or modify the database.

## Local Test Evidence

- With synthetic `RATE_LIMIT_BACKEND=upstash`, synthetic URL/token values, and a mocked successful REST response, `applyRateLimit(..., "REGISTER")` returned `{ allowed: true }`.
- With production mode and the rate-limit backend variables absent, it returned HTTP 503 with the exact reported error body.
- No real secret values were used, printed, stored, or sent to an external service.

## Validation

The requested commands are to be run after this diagnosis document is created:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`

No deployment or commit was performed.