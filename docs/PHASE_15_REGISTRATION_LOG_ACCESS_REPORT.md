# Phase 15 Registration Log Access Report

**Date:** 2026-08-25
**Deployment commit:** `81fe5c0` (`phase 15: add safe registration diagnostics`)
**Environment:** Vercel staging/Preview

## Outcome

The staging deployment was reachable and healthy:

- `GET /api/health`: HTTP 200
- `status`: `healthy`
- `checks.database`: `configured`
- `checks.auth`: `configured`
- `checks.environment`: `configured`

One registration request was previously sent after the diagnostic deployment:

- HTTP status: `400`
- Response code: `REGISTRATION_FAILED`
- Response error: `An unexpected error occurred.`
- Request reached the application: yes

No further registration request was sent.

## Diagnostic Log Availability

No records for the registration request were visible in the Vercel Runtime/Function Logs. None of the expected diagnostic operations or a correlation ID could be located:

- `organization slug lookup`
- `Supabase Auth user creation`
- `organization INSERT`
- `profile INSERT`
- `correlationId`

The diagnostic deployment logs therefore do not provide an operation, success flag, Supabase error code, status, message, or correlation ID.

## What This Proves

The missing records do not identify the registration failure. The following possibilities remain open:

1. The staging hostname served a deployment that did not contain commit `81fe5c0`.
2. The request reached a different deployment or Vercel project than the deployment viewed in the dashboard.
3. Runtime logs for this project, deployment, environment, or time range were unavailable or filtered out.
4. The function failed before the logging statements executed, such as during module initialization or another platform/runtime boundary.
5. Vercel did not expose the emitted console records in the selected log view.

The exact Supabase operation and error code/status/message remain undetermined. No RLS or database cause is inferred.

## Partial Registration State

No read-only Supabase/Auth inspection was available, so partial records were not verified:

- Auth user: unknown
- Organization: unknown
- Profile: unknown

Nothing was deleted or modified automatically.

## Security and Scope

No password, email, phone number, Supabase URL or keys, Upstash token, cookies, authorization headers, access tokens, refresh tokens, or request body is included. No code, database, RLS, authentication, or rate-limiting change was made during this investigation. No deployment or commit was performed after the diagnostic deployment.

## Recommended Next Evidence

A project owner should verify in Vercel that the staging hostname resolves to the deployment for commit `81fe5c0`, then check the deployment's Runtime Logs using the exact UTC request window. If records remain absent, enable an approved server-side log drain or obtain Vercel project-owner log access. Separately, use an approved read-only Supabase/Auth inspection method to check the test account and related records. Do not retry registration or fix the database issue until those records are known.
