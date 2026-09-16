# VoteHub Staging Environment Status

**Date:** 2026-08-20
**Scope:** Phase 15 Step 5D diagnosis
**Deployment changes:** None

## Health Diagnosis

The current `/api/health` implementation reports aggregate results:

- `environment=missing_variables` means at least one of `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `DATABASE_URL` is absent. The endpoint does not identify which individual variable is missing.
- `auth=not_configured` means at least one of `NEXTAUTH_URL` or `NEXTAUTH_SECRET` is absent. The endpoint does not identify which individual variable is missing.
- `database=configured` is not a connectivity check and is set independently of the environment result.

Therefore, the exact variables to verify in Vercel Preview are the five names above. This repository cannot inspect Vercel's secret values, and no values are printed here.

## Variable Inventory

`CURRENT STATUS` describes the staging deployment based on the health response and source inspection. For grouped health checks, `MISSING` means the variable is part of a failing aggregate check and must be individually verified in Vercel; the endpoint cannot prove that every member of the group is absent.

| VARIABLE NAME | PURPOSE | PUBLIC/SERVER-ONLY | REQUIRED | CURRENT STATUS |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL for browser, server, middleware, and auth clients | PUBLIC | Yes | CONFIGURED |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public client key protected by RLS | PUBLIC | Yes | CONFIGURED |
| `NEXT_PUBLIC_APP_URL` | Canonical HTTPS origin for generated links and redirects | PUBLIC URL | Yes for staging flows | CONFIGURED |
| `SUPABASE_URL` | Legacy server-side health-check URL variable | SERVER-ONLY | Yes for current health result | MISSING |
| `SUPABASE_ANON_KEY` | Legacy server-side health-check anon-key variable | SERVER-ONLY | Yes for current health result | MISSING |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase server client | SERVER-ONLY SECRET | Yes | CONFIGURED |
| `DATABASE_URL` | Prisma datasource and health-check configuration variable | SERVER-ONLY SECRET | Yes for current health result | MISSING |
| `NEXTAUTH_URL` | URL required by the current health/auth configuration check | SERVER-ONLY | Yes for current health result | MISSING |
| `NEXTAUTH_SECRET` | Secret required by the current health/auth configuration check | SERVER-ONLY SECRET | Yes for current health result | MISSING |
| `NODE_ENV` | Selects runtime behavior; production disallows memory rate limiting | SERVER RUNTIME | Yes in staging deployment | CONFIGURED |
| `APP_VERSION` | Non-secret version shown by health endpoints | SERVER RUNTIME | No | OPTIONAL |
| `RATE_LIMIT_BACKEND` | Selects `upstash` or local `memory` rate-limit storage | SERVER-ONLY | Yes when staging runs production mode | MISSING |
| `UPSTASH_REDIS_REST_URL` | Shared Upstash Redis REST endpoint | SERVER-ONLY CONFIGURATION | Yes when backend is `upstash` | MISSING |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST authentication token | SERVER-ONLY SECRET | Yes when backend is `upstash` | MISSING |
| `EMAIL_PROVIDER` | Selects SendGrid, Resend, SMTP, or logging mode | SERVER-ONLY | No for basic app startup; yes for email delivery | OPTIONAL |
| `EMAIL_API_KEY` | SendGrid or Resend provider credential | SERVER-ONLY SECRET | Yes when provider is SendGrid or Resend | OPTIONAL |
| `EMAIL_FROM` | Verified sender address | SERVER-ONLY | Yes for real email delivery | OPTIONAL |
| `SMTP_HOST` | SMTP server hostname | SERVER-ONLY | Yes when provider is SMTP | OPTIONAL |
| `SMTP_PORT` | SMTP server port | SERVER-ONLY | Yes when provider is SMTP | OPTIONAL |
| `SMTP_USER` | SMTP username | SERVER-ONLY | Yes when provider is SMTP | OPTIONAL |
| `SMTP_PASSWORD` | SMTP password | SERVER-ONLY SECRET | Yes when provider is SMTP | OPTIONAL |

## Authentication

The active authentication architecture is Supabase Auth. Middleware, server clients, and protected routes use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the admin client additionally requires `SUPABASE_SERVICE_ROLE_KEY`.

`NEXTAUTH_URL` and `NEXTAUTH_SECRET` are not used by the active request authentication path, but the public health endpoint still requires both to report `auth=configured`. The staging `auth=not_configured` result is therefore caused by that legacy health-check contract, not by a demonstrated Supabase Auth implementation failure. No authentication code was changed.

## Database

`DATABASE_URL` is required by the current health endpoint's environment check and Prisma configuration. The health response's `database=configured` value is misleading because the current route sets it to `configured` without testing connectivity. Verify `DATABASE_URL` in Vercel Preview without exposing its value.

## Rate Limiting and Upstash

The rate-limit service permits `memory` only when `NODE_ENV` is not `production`. When staging runs with `NODE_ENV=production`, it requires:

- `RATE_LIMIT_BACKEND=upstash`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

A local development run can safely use the in-memory backend. A production-mode staging deployment should use Upstash for shared, multi-instance counters; no Upstash values are present in this repository.

## Email

Email is optional for basic startup because the service falls back to logging when no provider is selected. Real delivery requires `EMAIL_PROVIDER` plus provider-specific variables. SendGrid and Resend require `EMAIL_API_KEY` and `EMAIL_FROM`; SMTP requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`.

## Storage

No storage-specific environment variable, upload route, or bucket configuration was found in the inspected source. Storage is therefore `OPTIONAL` for this staging diagnosis and remains unverified.

## Vercel Environment Scope

This deployment is staging, so configure staging values in Vercel's **Preview** environment for the Git branch/deployment being tested. Do not add staging values to **Production**. Development values belong in local development configuration and must not be committed.

The exact Vercel Preview variables required to clear the current health result are:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

For production-mode staging rate limiting, also configure:

- `RATE_LIMIT_BACKEND`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Keep `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `EMAIL_API_KEY`, `SMTP_PASSWORD`, and `UPSTASH_REDIS_REST_TOKEN` server-only. The public variables are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`.

After the five health-check variables are configured in the correct Vercel Preview environment, `/api/health` should change its environment check to `configured` and its auth check to `configured`, so the overall status should become `healthy` unless another runtime check or deployment configuration fails. This does not validate database connectivity or Supabase Auth connectivity.

## Validation

- `npm run lint`: PASS with existing warnings; no lint errors.
- `npm run typecheck`: PASS.
- `npm run build`: Compilation and TypeScript PASS; local route-data collection stops because this shell intentionally has no `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` values.
- `npm test`: PASS.

No `.env.local.example` file exists. `.env.example` documents the variable names only; it contains placeholders and no real credentials.
