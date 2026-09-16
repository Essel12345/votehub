# Phase 15 Final Controlled Registration Result

## Corrected Registration Attempt

- Deployment tested: `https://votehub-staging.vercel.app`
- Commit target: `81fe5c0`
- Health: HTTP `200`; `healthy`; database, auth, and environment `configured`
- Endpoint: `POST /api/auth/register`
- Requests sent for corrected attempt: `1`
- Result: `REGISTRATION_FAILED`
- HTTP status: `400`
- Error code: `REGISTRATION_FAILED`
- Sanitized message: `An unexpected error occurred.`
- Registration logic reached: `Yes, based on the non-validation registration failure response`
- Operation: unavailable from response; no server diagnostic log was available
- Correlation ID: unavailable from response

Creation status could not be verified from the response:

- Auth user created: unknown
- Organization created: unknown
- Profile created: unknown

The exact failed operation cannot be distinguished from the available response. No retry was made.

## Health Result

- Endpoint: `GET /api/health`
- HTTP status: `200`
- Status: `healthy`
- Database: `configured`
- Auth: `configured`
- Environment: `configured`

## Diagnostic Result

The request passed validation and returned a server-side registration failure. The available response did not include an operation or correlation ID, and no server diagnostic log was available.

| Field | Result |
| --- | --- |
| operation | unavailable |
| success | false |
| errorCode | `REGISTRATION_FAILED` |
| status | `400` |
| sanitized message | An unexpected error occurred. |
| correlationId | unavailable |

The following operations could not be distinguished from the response:

1. Organization slug lookup
2. Auth user creation
3. Organization INSERT
4. Profile INSERT

## Creation Results

- Auth user created: unknown
- Organization created: unknown
- Profile created: unknown

The password is intentionally not included in this report. No retry was made. No code, Supabase, RLS, database, deployment, or commit changes were made.
