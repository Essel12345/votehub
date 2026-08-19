# Production Rate-Limit Plan

**Date:** 2026-08-19  
**Status:** Integration prepared; production configuration still required  
**Deployment performed:** No

## Current State

`src/lib/security/rate-limit.service.ts` currently uses a process-local in-memory store. It supports fixed-window counters, verified Supabase user IDs, IP identifiers, explicit user/election overrides, `429` responses, and sensitive admin protection. It is suitable for local development and a single application instance only.

No Redis, Upstash, Memcached, Supabase rate-limit table, or other shared cache is currently present in `package.json`, `package-lock.json`, or application source.

## Endpoint Identifier Review

| Protection | Current integration | Identifier |
|---|---|---|
| Login | Configuration exists; no login route currently calls it | IP when used |
| Registration | `POST /api/auth/register` | IP |
| Ballot submission | Configuration exists; no ballot route currently calls it | Explicit user + election identifier when used |
| Voter lookup | Configuration exists; no lookup route currently calls it | IP when used |
| General admin API | Admin audit logs, dashboard stats, elections, organization detail, security events | Verified Supabase user ID, falling back to IP if unauthenticated |
| Invitations | Configuration exists; no invitation route currently calls it | Verified Supabase user ID when used |
| Super Admin/sensitive admin | Role changes, organization suspend/reactivate, system health, election status transitions | Verified Supabase user ID, falling back to IP if unauthenticated |

Rate limiting remains an additional layer. It does not replace authentication, authorization, RLS, organization scoping, or database duplicate-vote constraints.

## Options

### Option 1: Upstash Redis over REST

- **Deployment compatibility:** Strong fit for Vercel/serverless and multiple Next.js instances; no persistent connection pool is required.
- **Cost:** Managed usage-based pricing; free/developer tiers may support staging, while production cost depends on request volume and retention.
- **Security:** REST URL and token remain server-only; TLS is used by the service. Keys must never be exposed through `NEXT_PUBLIC_*` variables.
- **Reliability:** Shared atomic Redis operations provide consistent counters across instances; availability depends on the Upstash region/service.
- **Latency:** One network round trip per checked request, typically higher than local memory but consistent across instances.
- **Setup:** Create an Upstash Redis database, configure `RATE_LIMIT_BACKEND=upstash`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
- **Failure behavior:** Production requests fail closed with `503` when the shared backend is unavailable; development memory mode may fail open for local work.
- **Complexity:** Moderate. The REST adapter can use an atomic Lua `EVAL` command without adding a package dependency.

### Option 2: Supabase/Postgres rate-limit table

- **Deployment compatibility:** Works with the existing Supabase account and application, including multiple instances.
- **Cost:** Uses existing database resources, but high request volume adds database load and may require a paid plan.
- **Security:** Requires a carefully designed server-only function/table policy; service-role access must be tightly contained.
- **Reliability:** Database availability is shared with core voting data, so rate-limit traffic could compete with election workloads.
- **Latency:** Usually higher than a purpose-built cache and adds database round trips.
- **Setup:** New migration, atomic stored procedure, retention/TTL cleanup, and RLS/service-role review.
- **Failure behavior:** Could fail closed, but a database incident would affect both core data and throttling.
- **Complexity:** High. It expands the schema and introduces operational coupling to the voting database.

### Option 3: Self-hosted Redis or managed Redis through a persistent server

- **Deployment compatibility:** Strong for a long-running Node server; less convenient for serverless unless a compatible hosted endpoint is used.
- **Cost:** Infrastructure, backups, monitoring, and operational ownership are required.
- **Security:** Requires network controls, TLS, credential rotation, and connection management.
- **Reliability:** Good when operated correctly, but adds another service to maintain.
- **Latency:** Low when colocated with the application.
- **Setup:** Redis deployment, client dependency, connection pooling, health checks, and failover plan.
- **Failure behavior:** Must fail closed for sensitive production endpoints.
- **Complexity:** High for the current platform because no Redis infrastructure exists.

### Option 4: Process-local memory

- **Deployment compatibility:** Local development and one instance only.
- **Cost:** None.
- **Security:** Counters can be bypassed by routing requests to another instance or restarting the process.
- **Reliability:** Simple, but state is lost on restart.
- **Latency:** Lowest.
- **Setup:** Already implemented.
- **Failure behavior:** Not applicable to a shared service; it cannot provide distributed enforcement.
- **Complexity:** Low, but not production-safe for multiple instances.

## Recommendation

Use **Upstash Redis over REST** as the shared production backend. It matches the existing Next.js/Vercel direction, avoids adding a database migration to the voting schema, and supports atomic fixed-window counters across instances. The prepared adapter is configuration-gated and does not claim production readiness until a real Upstash account is configured and integration-tested.

## Required Environment Variables

These are server-only and must not use the `NEXT_PUBLIC_` prefix:

```text
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=https://<database>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<server-only-token>
```

For local development only:

```text
RATE_LIMIT_BACKEND=memory
```

Production must not use `memory`. The application rejects that configuration for rate-limited requests rather than silently falling back to process-local state.

## Rollout and Verification

1. Create the Upstash database in the approved production region.
2. Configure the three server-only variables in staging first.
3. Run below-limit, at-limit, above-limit, reset, concurrent, and backend-failure tests across at least two application instances.
4. Verify `429`, `Retry-After`, reset timestamps, user identifiers, IP identifiers, and user/election identifiers.
5. Verify sensitive operations fail closed when the backend is unavailable.
6. Configure production only after staging evidence and monitoring alerts are approved.

No credentials are present in this repository and none were invented.