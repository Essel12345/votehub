# Phase 15 Registration Diagnostic Change

**Date:** 2026-08-24  
**Scope:** Temporary server-side registration diagnostics only

## Files Changed

- `app/api/auth/register/route.ts`
- `src/services/auth.service.ts`
- `docs/PHASE_15_REGISTRATION_DIAGNOSTIC_CHANGE.md`

## Diagnostic Behavior

The route generates a correlation ID with `crypto.randomUUID()` after payload validation and passes it to `registerOrganization()`.

The service emits one structured server-side record for each major operation:

- `organization slug lookup`
- `Supabase Auth user creation`
- `organization INSERT`
- `profile INSERT`

Each record contains only:

```text
operation
success
errorCode
status
message
correlationId
```

Successful records use empty values for error metadata. Failed records extract only the Supabase error code/status/statusCode and a sanitized, newline-free message limited to 300 characters. Message sanitization redacts email addresses, phone-number-like values, and URLs.

Logs use `console.info` for success and `console.error` for failure. They are server-side only.

## Security Confirmation

The diagnostic records do not include passwords, email addresses, phone numbers, full user objects, Supabase URLs, Supabase keys, Upstash tokens, cookies, authorization headers, access tokens, refresh tokens, or request payloads.

## Public API Confirmation

The public API behavior is unchanged. The route still returns the existing validation, rate-limit, success, and registration-failure responses. No diagnostic fields are added to the HTTP response body.

No registration request was sent after this change.

## Validation

- `npm run lint`: completed successfully with existing repository warnings.
- `npm run typecheck`: passed.
- `npm run build`: compilation and TypeScript passed, but route data collection failed because the local shell does not have `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` configured. This is the existing initialization guard in `src/lib/supabase/admin.ts`, not a diagnostic logging error.

No deployment or commit was performed.
