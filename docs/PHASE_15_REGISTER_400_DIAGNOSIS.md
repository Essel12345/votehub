# Phase 15 Registration 400 Diagnosis

**Date:** 2026-08-24
**Endpoint:** `POST /api/auth/register`
**Scope:** Existing deployed staging request
**Deployment/code/database changes:** None

## 1. Result

The single staging registration request returned:

```text
HTTP 400
code: REGISTRATION_FAILED
error: An unexpected error occurred.
```

The request reached the Next.js application. No additional registration request was sent.

## 2. Registration Flow Trace

The active route is `app/api/auth/register/route.ts`:

1. `applyRateLimit(request, "REGISTER")` runs first. The request returned neither `429` nor `503`, so the available evidence shows that rate limiting allowed the request.
2. The JSON body is parsed and checked with `registerSchema.safeParse()`.
3. `registerOrganization(parsed.data)` is called.
4. `registerOrganization()` validates again with `registerSchema.parse()`.
5. `ensureUniqueOrganizationSlug(organizationName)` creates an anonymous Supabase server client and queries `organizations` for an existing slug.
6. Only after that query succeeds does the service call `adminClient.auth.admin.createUser()`.
7. It then inserts the organization row into `organizations`.
8. It then inserts the administrator profile into `profiles`, setting `organization_id` to the new organization ID and `role` to `ORGANIZATION_ADMIN`.
9. The route returns `201` only if all of the above succeed. Its catch block returns `400` for downstream errors.

The organization/profile relationship is created in the profile insert; there is no separate relationship operation in this flow.

## 3. Exact Failing Operation

The exact remote operation cannot be proven from this workspace because the corresponding Vercel function log was unavailable and no remote database inspection credentials or mechanism were available.

The strongest source-supported failure point is **E: the organization slug preflight query**, specifically:

```text
anonymous Supabase client
  -> from("organizations")
  -> select("id")
  -> eq("slug", slug)
  -> maybeSingle()
```

This query runs before Supabase Auth user creation. If it receives a PostgREST/RLS/database error, the service executes `throw error` on the raw Supabase error object. The route then sees a non-`Error` value and substitutes `"An unexpected error occurred."`.

That behavior exactly explains the generic response without requiring Auth, organization insertion, or profile insertion to have run.

The source does not establish that this query definitely failed: an Auth, organization insert, or profile insert failure would also be caught by the route, although the service wraps those three failures in ordinary `Error` objects and would normally expose their sanitized application messages.

## 4. Sanitized Server Error

Observed application response:

```json
{
  "code": "REGISTRATION_FAILED",
  "error": "An unexpected error occurred."
}
```

No lower-level server error was available in the workspace. The route intentionally discards the details when the thrown value is not an `Error` instance.

## 5. Vercel Log Evidence

Vercel server logs for the failed request could not be retrieved:

- Vercel CLI: unavailable in the workspace.
- Local `.vercel` metadata: absent.
- Captured `test-error.txt` and `test-full-output.txt`: empty.
- No Vercel log export or request-ID log record is present in the repository.

Therefore, there is no log evidence identifying a Supabase HTTP status, error code, or message. The only deployment evidence is the observed application-level `400` response with `code: REGISTRATION_FAILED`.

## 6. Supabase Response

No raw Supabase response was available. Consequently, the Supabase HTTP status, error code, and message cannot be reported without speculation.

The likely class of response at the source-supported failure point is a PostgREST/RLS/database error from the anonymous `organizations` slug lookup. The anonymous server client uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; it does not use the service-role client for this preflight query.

## 7. Environment Variable Names and Status

Values were not printed or inspected.

| Variable | Status/evidence |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Documented as configured for staging in `docs/STAGING_ENVIRONMENT_STATUS.md`; no local value exists. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Documented as configured for staging; no local value exists. |
| `SUPABASE_SERVICE_ROLE_KEY` | Documented as configured for staging; no local value exists. |
| `RATE_LIMIT_BACKEND` | Previously documented as missing; the observed request did pass the rate-limit stage, so the current deployed status cannot be independently confirmed here. |
| `UPSTASH_REDIS_REST_URL` | Previously documented as missing; current deployed status cannot be independently confirmed here. |
| `UPSTASH_REDIS_REST_TOKEN` | Previously documented as missing; current deployed status cannot be independently confirmed here. |

The local workspace has no `.env`, `.env.local`, `.env.production`, `.env.preview`, or `.vercel/project.json` file. `.env.example` contains names/placeholders only.

## 8. Partial Registration

A partial Auth user, organization, or profile could not be verified from this workspace. No remote database/Auth inspection mechanism or Vercel log was available, and nothing was deleted automatically.

Based on the strongest source-supported diagnosis, the slug preflight failed before Auth user creation, so no records should have been created. This is an inference, not remote verification.

If the slug preflight succeeded, the service has no rollback transaction: a later organization or profile failure could leave a partial Auth user or organization. The current response alone cannot distinguish that case.

## 9. Root Cause

**Most likely root cause:** the registration service performs the unauthenticated organization slug lookup through the anon Supabase client, and a returned Supabase error is thrown as a raw object. The route converts that non-`Error` throw to the generic `"An unexpected error occurred."` response.

The likely underlying infrastructure/data cause is an RLS, schema, or database permission error on the `organizations` lookup, but the specific cause requires the Vercel function log or a safe server-side diagnostic of the Supabase response.

The failure is not attributable to Vercel deployment protection, route method handling, request validation, or the rate limiter based on the evidence already collected.

## 10. Minimal Secure Fix

Do not apply a fix in this diagnostic phase. The minimal secure implementation change, once the remote error is confirmed, would be to perform the slug-existence lookup with an appropriately authorized server-side Supabase client or an explicitly permitted narrowly scoped database function, while preserving RLS and the service-role key on the server only.

Independently, the route/service should preserve sanitized error handling while logging only a correlation ID and non-secret error category/message server-side. It must not log passwords, keys, tokens, cookies, authorization headers, or full user records.

Before any fix is deployed, confirm the exact Vercel log entry and whether the failed request left partial records. Do not retry registration until that evidence is collected and the test-account state is understood.

## 11. Validation

The requested validation commands were run after creating this report:

- `npm run lint` completed successfully.
- `npm run typecheck` completed successfully.
- `npm run build` compiled successfully but failed during page-data collection because the local shell has no `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` values. The failure is the existing module-initialization guard in `src/lib/supabase/admin.ts`, not a code or report change.

No deployment or commit was performed.
