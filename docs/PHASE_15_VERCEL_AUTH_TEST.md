# Phase 15 Vercel Authentication Test

**Date:** 2026-08-22
**Deployment:** Existing staging/Preview deployment; no deployment performed

## 1. Staging URL Tested

```text
https://votehub-staging-17r3od9ce-essel12345s-projects.vercel.app
```

Only the hostname is recorded here. No credentials, cookies, keys, or tokens were used.

## 2. POST `/api/auth/register` Status

Request:

```text
POST /api/auth/register
Content-Type: application/json
Body: {}
```

Response:

```text
HTTP 400 Bad Request
```

## 3. Sanitized Response

```json
{
  "error": "Invalid input: expected string, received undefined",
  "code": "INVALID_INPUT"
}
```

This is the expected application validation response for an empty registration body. No account or organization was created.

## 4. Whether Vercel Protection Still Blocked the Request

No. The request passed through the Vercel deployment and reached the Next.js registration route. The previous Vercel-level response was HTTP 401 with an empty body; the current response is the route's sanitized HTTP 400 validation response.

The response included:

```text
Server: Vercel
```

That header identifies the hosting platform but does not indicate that deployment protection blocked the request. The application-specific error body confirms the request reached Next.js.

## 5. `/auth/login` Result

```text
GET /auth/login
HTTP 200 OK
Server: Vercel
```

The response body was not recorded because only the status was required and no credentials were involved.

## 6. `/dashboard` Result

```text
GET /dashboard
HTTP 307 Temporary Redirect
Location: /auth/login?redirectTo=%2Fdashboard
Server: Vercel
```

This is the expected unauthenticated middleware response. It confirms `/dashboard` is reachable and remains protected by application authentication.

## 7. Conclusion

The Vercel Authentication/Deployment Protection change is effective for the staging Preview deployment. The public registration route now reaches Next.js, rejects the intentionally empty body with HTTP 400, and does not return the prior Vercel-level HTTP 401. The login route returns HTTP 200, and the dashboard retains its expected authentication redirect.

No application code, middleware, Supabase configuration, database, rate limiting, environment variables, organization data, deployment, or commit was changed.
