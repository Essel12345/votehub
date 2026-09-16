# Phase 15 Registration Fix Validation

## Scope

Applied locally:

- Registration-owned database operations now use the existing server-only `adminClient`.
- An additive Supabase migration was created for the missing organization columns and unique slug index.

Not performed:

- No registration request.
- No production deployment.
- No commit.
- No RLS change, anon policy, grant, rate-limit change, password-validation change, or data deletion.

## Files Changed

- `src/services/auth.service.ts`
- `supabase/migrations/20260907120000_registration_organizations_compatibility.sql`
- `docs/PHASE_15_REGISTRATION_FIX_VALIDATION.md`

The old duplicate Prisma-only migration copy was removed because the intended target is Supabase and Supabase CLI migrations belong under `supabase/migrations`.

## Migration

Migration file:

`supabase/migrations/20260907120000_registration_organizations_compatibility.sql`

It uses `ADD COLUMN IF NOT EXISTS` for nullable columns:

- `slug text`
- `status text`
- `description text`
- `website text`
- `contact_email text`
- `contact_phone text`

It creates:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key
  ON public.organizations (slug)
  WHERE slug IS NOT NULL;
```

The migration does not enable/disable RLS, alter policies, grant anon access, add NOT NULL constraints, or delete data.

**Staging application status:** Not applied. The local Supabase CLI reported `Cannot find project ref. Have you run supabase link?`; no staging project is linked. `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are also unavailable in this shell. Applying against an unverified database would be unsafe.

## Expected Database Schema After Application

Live verification was not possible. Based on the migration and the supplied pre-migration evidence, `public.organizations` should contain:

| Column | Expected after migration |
| --- | --- |
| `id` | existing |
| `name` | existing |
| `slug` | added, nullable text |
| `country` | existing |
| `timezone` | existing |
| `status` | added, nullable text |
| `description` | added, nullable text |
| `website` | added, nullable text |
| `contact_email` | added, nullable text |
| `contact_phone` | added, nullable text |
| `created_at` | existing |

Expected index: nullable unique `organizations_slug_key` on `slug`.

## RLS Status

No RLS statements or policy changes were included. Existing RLS is intended to remain enabled and unchanged, but live staging verification is pending the project link and authorized read-only access.

## Registration Clients

| Operation | Client after change | Credential boundary |
| --- | --- | --- |
| Organization slug lookup | `adminClient` | Server-only `SUPABASE_SERVICE_ROLE_KEY` |
| Auth user creation | `adminClient` | Server-only `SUPABASE_SERVICE_ROLE_KEY` |
| Organization INSERT | `adminClient` | Server-only `SUPABASE_SERVICE_ROLE_KEY` |
| Profile INSERT | `adminClient` | Server-only `SUPABASE_SERVICE_ROLE_KEY` |

The service-role key remains in `src/lib/supabase/admin.ts`, is not placed in client code, returned in API responses, or logged. Rate limiting, request validation, password validation, sanitized errors, and diagnostic logging remain unchanged.

## Failure Safety

The existing flow has no cleanup or transaction if Auth succeeds and a later organization/profile operation fails. No destructive cleanup was introduced. The current change only corrects the client authorization boundary; transaction/compensation remains a separate concern.

## Test Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errors and 306 existing warnings |
| `npm test -- --test-reporter=spec` | PASS, 438 passed, 0 failed |
| `git diff --check` | PASS for focused changes |
| Focused source diagnostics | No errors in `src/services/auth.service.ts` |

## Build Result

`npm run build` compiled the application successfully, but the build failed while collecting configuration for `/api/auth/register` because this shell lacks:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

This prevented completion of the production build locally. No credentials were printed or recorded.

## Deployment Readiness

**Not ready for staging registration testing.** Before deployment or registration:

1. Link the Supabase CLI to the intended staging project.
2. Apply the migration to staging.
3. Verify the full organization schema, `organizations_slug_key`, RLS enabled state, and unchanged policies through an authorized read-only channel.
4. Run the build in an environment with the required configured variables.
5. Deploy the validated code to the intended staging deployment.
6. Only then perform the separately controlled registration test.

No registration request was sent during this task.