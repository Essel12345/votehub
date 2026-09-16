# Phase 15 Registration Root Cause Diagnosis

**Date:** 2026-08-24
**Endpoint:** `POST /api/auth/register`
**Scope:** Diagnosis only; no registration retry

## 1. Exact Failing Operation

The exact remote operation cannot be established from the available evidence.

The source path after validation and rate limiting is:

1. `ensureUniqueOrganizationSlug(organizationName)` creates a Supabase SSR server client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. It performs an `organizations` slug lookup:

   ```text
   from("organizations")
   .select("id")
   .eq("slug", slug)
   .limit(1)
   .maybeSingle()
   ```

3. `adminClient.auth.admin.createUser(...)` creates the Auth user using the server-only service-role client.
4. A second SSR client inserts the organization into `organizations` and selects the inserted row.
5. The SSR client inserts the profile into `profiles`, setting `id` to the Auth user ID, `organization_id` to the organization ID, and `role` to `ORGANIZATION_ADMIN`.
6. The route returns HTTP 201 only if every operation succeeds.

The observed application response was HTTP 400 with `REGISTRATION_FAILED` and `An unexpected error occurred.`. The route emits that generic message when the thrown value is not an `Error`. The slug lookup throws the raw Supabase error object, making it the strongest source-supported candidate, but the response does not prove that it was the failing operation. Auth, organization INSERT, and profile INSERT errors are also caught by the same route.

**Exact operation:** undetermined from available remote evidence.
**Most likely source-supported operation:** `organizations` slug lookup before Auth creation.

## 2. Exact Sanitized Supabase Error

No exact Supabase error was available.

- Supabase error code: unavailable
- Supabase HTTP status: unavailable
- Supabase message: unavailable
- Application-level response: `HTTP 400`, `code: REGISTRATION_FAILED`, `error: An unexpected error occurred.`

The route does not log or return the raw Supabase error, and the workspace contains no captured Vercel function log for this request.

## 3. Vercel Log Evidence

Vercel logs could not be retrieved from this workspace:

- Vercel CLI is unavailable.
- Local `.vercel` metadata is absent.
- No Vercel request-log export or request ID is present.
- Local `test-error.txt` and `test-full-output.txt` are empty.

The only remote evidence available is the previously observed application-level HTTP 400 response. It does not identify a Supabase operation or error details.

## 4. Database, Policies, Constraints, and Relationship

A direct live Supabase catalog inspection was not available. The following is repository design evidence only, not confirmation of the deployed project:

- `organizations` is expected to contain at least `id`, `name`, `slug`, `country`, `timezone`, `status`, `description`, `website`, `contact_email`, and `contact_phone` for the registration INSERT.
- `profiles` is expected to contain `id`, `email`, `full_name`, `organization_id`, `role`, `country`, `timezone`, and `is_active`.
- `profiles.organization_id` is expected to reference `organizations.id` with `ON DELETE SET NULL`.
- `profiles.role` is expected to allow `ORGANIZATION_ADMIN`.
- The expected profile relationship is `profiles.organization_id = organizations.id`; there is no separate relationship write in the registration service.
- Repository migration artifacts enable RLS on `profiles` and describe role-based policies. They do not provide a verified live policy listing for the deployed database.
- Repository tests asserting RLS and constraints are test descriptions/synthetic assertions, not live Supabase catalog queries.

No live unique-constraint, foreign-key, column, or policy result can be reported without a read-only database connection or Supabase SQL/API inspection access.

## 5. Partial Registration

The failed request may have created a partial record because the service performs Auth, organization, and profile writes without a database transaction or compensating cleanup. However, no partial record can be verified from this workspace:

- Auth user: unknown
- Organization: unknown
- Profile: unknown

No records were deleted or modified automatically.

If the slug lookup failed, the failure occurred before Auth creation and no records should have been created. That is an inference from control flow, not a live database/Auth check.

## 6. Root Cause

The confirmed root cause of the unhelpful diagnostic response is error handling: a raw Supabase error from the slug lookup is thrown, and the route replaces any non-`Error` thrown value with `An unexpected error occurred.`. This prevents the deployed response from identifying the underlying Supabase code, status, message, or operation.

The underlying remote database/Auth cause is **not proven**. It must not be labeled as RLS, schema, permission, constraint, or duplicate-email failure without Vercel logs or direct read-only Supabase evidence.

The failure is not a validation failure: the application returned `REGISTRATION_FAILED`, not `INVALID_INPUT`. It is not the earlier Vercel protection, route-method, or rate-limiter failure based on the observed request history.

## 7. Minimal Secure Fix

Do not implement a fix in this diagnosis.

The minimal secure diagnostic fix, after approval, would be server-side structured logging of a correlation ID, operation name, Supabase error code, HTTP status/statusCode, and sanitized message, while never logging passwords, keys, tokens, cookies, authorization headers, or full user records. The response should remain sanitized.

After the exact remote error is confirmed, apply only the necessary server-side/database correction. Preserve authentication, RLS, rate limiting, and the service-role key's server-only boundary. Also consider a transaction or compensating cleanup strategy for the multi-step creation flow, but do not introduce it as part of this diagnosis.

## 8. Evidence Boundary

No registration request was sent during this diagnosis. No database query, schema change, policy change, deployment, or commit was performed. The requested exact error and live partial-record status require access to the corresponding Vercel function log and a read-only Supabase project/database inspection channel.
