# Phase 15 Registration Error Result

**Date:** 2026-08-24
**Target:** Existing Vercel staging/Preview URL
**Commit:** `81fe5c0` (`phase 15: add safe registration diagnostics`)

## 1. Deployment Status

The diagnostic commit was pushed to the existing `deploy-dependency-fix` branch, which is connected to the staging/Preview deployment. The known staging URL responded from Vercel after the push. This workspace has no Vercel CLI, project metadata, or deployment API credentials, so the internal Vercel deployment state could not be independently confirmed as `Ready`.

No Production deployment was performed.

## 2. Health Status

`GET /api/health` returned HTTP 200:

```json
{
  "status": "healthy",
  "checks": {
    "database": "configured",
    "auth": "configured",
    "environment": "configured"
  }
}
```

## 3. Registration HTTP Status

Exactly one registration request was sent after the health check.

```text
HTTP status: 400
Request reached application: yes
```

Sanitized public response:

```json
{
  "error": "An unexpected error occurred.",
  "code": "REGISTRATION_FAILED"
}
```

## 4. Diagnostic Log Result

No diagnostic record could be retrieved. The public response does not include the server-generated correlation ID, and Vercel function-log access is unavailable in this workspace:

- Vercel CLI: unavailable
- Local `.vercel` metadata: absent
- Vercel log export/request log: unavailable

Therefore the following fields are unavailable rather than guessed:

```text
operation: unavailable
success: unavailable
errorCode: unavailable
status: unavailable
message: unavailable
correlationId: unavailable
```

## 5. Failure Position

The exact operation cannot be established from the HTTP response alone. The source execution order is:

1. organization slug lookup
2. Supabase Auth user creation
3. organization INSERT
4. profile INSERT

The strongest source-supported candidate remains the slug lookup because it throws a raw Supabase error, which the route converts to `An unexpected error occurred.`. The diagnostic log is required to prove this and was not accessible.

Whether failure occurred before or after Auth creation: **undetermined**.

## 6. Partial Records

Partial records were not detected or verified. No read-only Supabase/Auth inspection channel was available, and no records were deleted.

- Auth user: unknown
- Organization: unknown
- Profile: unknown

## 7. Security and Scope

The password and all secrets were entered/handled without being recorded in this report. No password, email, phone number, Supabase URL/key, Upstash token, cookie, authorization header, access token, refresh token, or request body is included.

No retry, code fix, database/RLS change, deployment to Production, or additional account creation was performed after the single test.
