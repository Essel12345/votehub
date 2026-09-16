# Phase 15 Registration Root Cause Confirmed

## Scope and Evidence

- Registration request: no additional request was sent.
- Database: compared against the supplied direct Supabase schema and policy evidence.
- Code: `src/services/auth.service.ts` and `app/api/auth/register/route.ts`.
- No code, database, RLS, deployment, or commit changes were made.

## Exact Code Flow

`POST /api/auth/register` executes in this order:

1. Apply the `REGISTER` rate limit.
2. Parse the JSON body.
3. Run `registerSchema.safeParse(body)`. Invalid input returns HTTP 400 with `INVALID_INPUT`.
4. Call `registerOrganization(parsed.data, crypto.randomUUID())`.
5. Parse again with `registerSchema.parse(data)`.
6. Derive first name, last name, and contact email values.
7. Generate a base slug from `organizationName`.
8. Check for an unused organization slug.
9. Create the Supabase Auth user.
10. Insert the organization and select the inserted row.
11. Insert the administrator profile.
12. Return HTTP 201 only if all operations succeed.

The previous corrected request returned `REGISTRATION_FAILED`, so request validation and the rate-limit response were passed. The route converts the raw Supabase error from the slug lookup into the generic `An unexpected error occurred.` response.

## Supabase Operations

| Order | Operation | Table / API | Columns selected or inserted | Client | Required access |
| --- | --- | --- | --- | --- | --- |
| 1 | Organization slug lookup | `organizations` | Selects `id`; filters `.eq("slug", slug)`; `.limit(1).maybeSingle()` | `createClient()` SSR client using `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Authenticated SELECT under the supplied policy; the registration request has no authenticated session |
| 2 | Auth user creation | Supabase Auth admin API | `email`, `password`, `email_confirm`, and user metadata: organization name/type, first/last/admin names, country, timezone, currency, locale, role | `adminClient` using `SUPABASE_SERVICE_ROLE_KEY` | Service-role/admin access; bypasses table RLS |
| 3 | Organization INSERT | `organizations` | `name`, `slug`, `country`, `timezone`, `status`, `description`, `website`, `contact_email`, `contact_phone`; then `.select().single()` | `createClient()` SSR client using the anon key | Authenticated INSERT and SELECT under the supplied policies; registration has no authenticated session |
| 4 | Profile INSERT | `profiles` | `id`, `email`, `full_name`, `organization_id`, `role`, `country`, `timezone`, `is_active` | `createClient()` SSR client using the anon key | Authenticated INSERT under the supplied policy; registration has no authenticated session |

## Slug Analysis

Registration does perform a slug lookup before creating the Auth user:

```text
from("organizations")
  .select("id")
  .eq("slug", slug)
  .limit(1)
  .maybeSingle()
```

The supplied live schema has `id`, `name`, `country`, `timezone`, and `created_at`, but not `slug`. Therefore this first query is incompatible with the verified table shape. The same query also uses the anon SSR client while the supplied policy permits SELECT only for authenticated users. The missing column is the schema mismatch; the policy is an independent authorization defect on the same first operation.

Because this query runs before Auth creation, the code path supports the conclusion that the first failing operation is the organization slug lookup. The exact PostgREST error code/status was not returned by the application and is therefore unavailable.

## Code / Database Comparison

The comparison below treats the supplied organization column list as complete.

| CODE EXPECTS | DATABASE HAS | MATCH? |
| --- | --- | --- |
| `id` for slug lookup and organization ID | `id` | Yes |
| `name` | `name` | Yes |
| `slug` for lookup and INSERT | Not present | No |
| `country` | `country` | Yes |
| `timezone` | `timezone` | Yes |
| `status` with value `PENDING` | Not present in supplied list | No |
| `description` | Not present in supplied list | No |
| `website` | Not present | No |
| `contact_email` | Not present | No |
| `contact_phone` | Not present | No |
| `created_at` | `created_at` | Not used by registration |

The organization INSERT therefore cannot match the verified schema even if the slug lookup were fixed: it sends `slug`, `status`, `description`, `website`, `contact_email`, and `contact_phone`, of which none are present in the supplied table evidence.

## RLS and Client Authorization

The registration route does not establish a user session before the database operations. `createClient()` uses the anon key and forwards request cookies; the registration request has no authenticated session.

- Slug lookup: anon client plus authenticated-only SELECT is not permitted.
- Auth user creation: service-role admin client is permitted and is not controlled by table RLS. This operation is later in the flow and is not reached if the slug lookup fails.
- Organization INSERT: anon client plus no INSERT policy is not permitted. The organization payload also has missing columns.
- Profile INSERT: anon client plus authenticated-only INSERT is not permitted.

The `SUPABASE_SERVICE_ROLE_KEY` being configured does not change the client used for the slug lookup or either table INSERT; the current code uses `adminClient` only for Auth user creation.

## Root-Cause Ranking

1. **Missing `slug` / organization schema mismatch: confirmed primary cause.** The first query references `organizations.slug`, which is absent from the supplied live schema. It occurs before Auth creation.
2. **Other missing organization columns: confirmed secondary schema defect.** The organization INSERT references `status`, `description`, `website`, `contact_email`, and `contact_phone`, which are absent from the supplied column list.
3. **RLS / authorization: confirmed independent blocker.** The slug SELECT and both table INSERTs use the anon client, while the supplied policies require authenticated access for SELECT/INSERT and provide no organization INSERT policy.
4. **Supabase Auth: not supported as the primary cause.** Auth uses the service-role client and is after the failing slug lookup; its operation was not reached on this control path.
5. **Other: not indicated by the available evidence.** The application response did not expose a separate error code, status, or correlation ID.

## Minimal Fix, Not Applied

### Minimal SQL Migration

Apply only after confirming the intended types, constraints, and existing data in the target database:

```sql
alter table public.organizations
  add column if not exists slug text,
  add column if not exists status text,
  add column if not exists description text,
  add column if not exists website text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

create unique index if not exists organizations_slug_key
  on public.organizations (slug)
  where slug is not null;
```

This migration does not modify RLS or create an anon INSERT policy. Any existing rows must be assessed before adding a non-null constraint. The application currently supplies all of these values during organization INSERT, so nullable additions are the smallest compatibility change.

### Minimal Code Change

Use the server-only `adminClient` for the registration-owned organization lookup and organization/profile writes, while keeping the service-role key server-only. Specifically, replace the `createClient()` instance in `ensureUniqueOrganizationSlug()` and the client used for the organization and profile inserts with `adminClient`.

This is necessary because registration has no authenticated user session at the time of those operations. It preserves RLS and does not create broad anon policies. The service should also retain the existing operation logging and avoid returning raw Supabase errors to clients.

An alternative would be a narrowly scoped server-side RPC with controlled permissions, but it is larger than the direct server-client change and is not needed for the minimal fix.

## Validation Plan

After explicit approval and after applying the separate schema/client changes:

1. Verify the final organization columns and the partial unique slug index with read-only schema inspection.
2. Verify RLS remains enabled and existing policies remain unchanged.
3. Confirm the route uses the service-role client only on the server for the slug lookup and both inserts.
4. Run one health check and confirm all required health fields.
5. Run one registration test with a new synthetic email, capturing sanitized operation diagnostics only.
6. Verify Auth user, organization, and profile records through an authorized read-only administrative channel.
7. Check that no password, key, token, cookie, or authorization header is logged.

STOP: No fix, registration request, database change, RLS change, deployment, or commit was performed during this analysis.