# VoteHub Health Environment Diagnosis

**Phase:** 15, Step 5H
**Date:** 2026-08-20
**Deployment action:** None
**Database/auth changes:** None

## 1. Health-Check Source File

The deployed route is:

```text
app/api/health/route.ts
```

The same implementation is also present at `src/app/api/health/route.ts`, but the deployed root App Router route is the authoritative path for the current Vercel build.

## 2. Function Responsible

The `GET(request: NextRequest)` function contains the environment check directly. There is no separate `checkEnvironment` helper.

The relevant condition is:

```ts
if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_ANON_KEY ||
  !process.env.DATABASE_URL
) {
  checks.environment = "missing_variables";
  status = "unhealthy";
}
```

The condition is an OR check. It reports the aggregate status and does not return the individual missing variable name.

## 3. Exact Variables Checked

The deployed health endpoint checks exactly these variables for `checks.environment`:

| Variable | Purpose | Visibility | Required for staging | Vercel Preview |
|---|---|---|---|---|
| `SUPABASE_URL` | Server-side Supabase configuration check used by the health route | Server-only | Yes for this health implementation | Yes |
| `SUPABASE_ANON_KEY` | Server-side Supabase configuration check used by the health route | Server-only | Yes for this health implementation | Yes |
| `DATABASE_URL` | Database configuration check used by the health route | Server-only secret | Yes for this health implementation | Yes |

These are the only variables capable of producing `environment: "missing_variables"` in the inspected deployed route. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `APP_VERSION`, and rate-limit variables are not part of this specific environment condition.

## 4. Variables Currently Detected

The staging response reports:

```json
{
  "database": "configured",
  "auth": "configured",
  "environment": "missing_variables"
}
```

From that response, the following conclusions are exact:

- The auth condition detected both `NEXTAUTH_URL` and `NEXTAUTH_SECRET` as present, because auth is `configured`.
- The environment condition did not evaluate all three of `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `DATABASE_URL` as present.
- The response does not reveal which member of the three-variable group is absent.
- `database: "configured"` does not prove that `DATABASE_URL` was detected. The route sets `checks.database` to `configured` independently and performs no database connection test.

## 5. Variables Missing

The exact missing individual name cannot be determined from the current health response because the route collapses the three checks into one boolean OR condition.

The exact variable set requiring individual verification in Vercel Preview is:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
DATABASE_URL
```

At least one of these is missing or unavailable to the deployed function. The current endpoint provides no safe way to distinguish one, two, or all three as missing without changing the health-check implementation or inspecting Vercel's environment configuration directly. No secret values were inspected or printed.

## 6. Staging Requirement

All three variables are required for the current health endpoint to report `environment: "configured"`.

`DATABASE_URL` is also required by the Prisma configuration. The Supabase URL and anon key used by the active application clients are normally the `NEXT_PUBLIC_*` pair, but this health route checks the separately named server-only pair.

## 7. Public Versus Server-Only

The three health-check variables are server-only from the health contract:

- `SUPABASE_URL`: server-only
- `SUPABASE_ANON_KEY`: server-only in this health check, although the application also has the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` equivalent
- `DATABASE_URL`: server-only secret

Never put `DATABASE_URL` in a `NEXT_PUBLIC_*` variable. Do not expose database credentials or service credentials.

## 8. Vercel Environment

Because this is staging, verify and configure these names in the Vercel **Preview** environment for the branch/deployment being tested. Do not add staging values to Vercel Production as part of this diagnosis.

## 9. Obsolete or Incorrect Requirements

The health check has a configuration contract mismatch:

- Active Supabase server/client code uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The health route checks `SUPABASE_URL` and `SUPABASE_ANON_KEY` instead.
- `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are checked by the health route even though Supabase Auth is the active request-authentication path.

Therefore, the server-only Supabase pair and NextAuth pair are legacy or potentially obsolete health requirements relative to the active architecture. They are still required to satisfy the current endpoint because the route explicitly checks them. This diagnosis does not change that code or authentication configuration.

## Validation

The requested commands were run without deployment or commit:

- `npm run lint`: Passed with existing warnings.
- `npm run typecheck`: Passed.
- `npm run build`: Compilation and TypeScript passed; local route collection requires Supabase environment values that are intentionally unavailable in the local shell.
- `npm test`: Passed.

## Exact Names Requiring Verification

```text
SUPABASE_URL
SUPABASE_ANON_KEY
DATABASE_URL
```

The current health response cannot identify which individual name or names in this list are missing.
