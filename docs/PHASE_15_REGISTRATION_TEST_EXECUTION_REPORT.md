# VOTEHUB PHASE 15 â€” REGISTRATION TEST EXECUTION REPORT

**Date:** 2026-09-01
**Time:** ~11:06 UTC
**Deployment:** votehub-staging (commit 81fe5c00e2315643b34559b209e17420d364f93b)
**Test Status:** REGISTRATION_FAILED

---

## Test Execution Summary

### Part 1: Rate-Limit Window Expiry âœ… PASSED

**Initial Attempt (2026-09-01 ~11:03 UTC):**
- HTTP 429 Too Many Requests
- Message: "Registration attempts: 5 per hour per IP"
- Retry-After: 3335 seconds (~55 minutes)
- Result: Rate limiter blocking test

**Second Attempt (2026-09-01 ~11:05 UTC):**
- HTTP 429 Too Many Requests
- Retry-After: 274 seconds (~4.5 minutes)
- Result: Window expiring; rate limiter still active

**Third Attempt (2026-09-01 ~11:06 UTC):**
- HTTP 429 â†’ HTTP 400 (Rate limiter expired; moved to registration logic)
- Result: Rate limiter window successfully expired

### Part 2: Schema Validation âœ… PASSED

**Request Payload:**
```json
{
  "organizationName": "Phase 15 Test Organization",
  "organizationType": "NONPROFIT",
  "country": "GH",
  "timezone": "Africa/Accra",
  "currency": "GHS",
  "locale": "en-GH",
  "contactPhone": "+233200000000",
  "website": "",
  "adminName": "Phase 15 Administrator",
  "firstName": "Phase 15",
  "lastName": "Administrator",
  "email": "phase15test20260901110611@gmail.com",
  "contactEmail": "phase15test20260901110611@gmail.com",
  "password": "Essel12345"
}
```

**Validation Result:**
- Request passed rate-limit check
- Request passed schema validation
- Payload structure matches `registerSchema` from `src/lib/validation/auth.ts`
- All required fields present and formatted correctly

### Part 3: Registration Logic âŒ FAILED

**HTTP Response:**
```
HTTP 400 Bad Request

{
  "error": "An unexpected error occurred.",
  "code": "REGISTRATION_FAILED"
}
```

**Failure Point:** `registerOrganization()` function (src/services/auth.service.ts)

**Error Classification:**
- Status: 400 (Client error / Business logic error)
- Not 500 (Not a server crash)
- Not 503 (Rate limiter backend available)
- Generic message indicates catch block was triggered

---

## Diagnostic Analysis

### What Succeeded

1. **Deployment is healthy** âœ…
   - URL responds to health checks
   - HTTP 200 on `/api/health` endpoint
   - Status: healthy

2. **Rate limiter is functional** âœ…
   - Rate limit enforced correctly (5 per hour)
   - Window expiration automatic
   - IP-based tracking working

3. **Schema validation working** âœ…
   - Request payload validated correctly
   - No validation errors returned
   - Request passed schema checks

4. **Deployment infrastructure ready** âœ…
   - Vercel deployment status: Ready
   - Build successful
   - Endpoints responding

### What Failed

**Registration logic encountered an error** âŒ

The error occurs after:
- âœ… Rate limit check passed
- âœ… Request parsing successful
- âœ… Schema validation passed

But before success (HTTP 201):
- âŒ Organization creation or user creation failed

### Root Cause (Likely)

The error is thrown from the `registerOrganization()` function in a `catch` block. Most probable causes:

#### Possibility 1: Supabase Auth User Creation Failure
```typescript
const { data: authData, error: authError } = await adminClient.auth.admin.createUser({...})
if (authError || !authData.user) {
  throw new Error(authError?.message ?? "Unable to create user account.");
}
```

**Likely sub-causes:**
- Email already exists in Supabase Auth (User 'phase15test...' already exists)
- Supabase service role key not configured
- Supabase URL not accessible
- Auth client not initialized

#### Possibility 2: Organization Insert Failure
```typescript
const { data: org, error: orgError } = await supabase
  .from("organizations")
  .insert([organizationPayload])
  .select()
  .single();
```

**Likely sub-causes:**
- RLS policy blocking insert
- Database not accessible
- Slug collision (unlikely, but checked with uniqueness function)
- Constraint violation

#### Possibility 3: Profile/User Profile Insert Failure

Similar database insert error in subsequent operations

---

## Evidence Quality Assessment

| Aspect | Status | Confidence | Notes |
|---|---|---|---|
| Deployment is ready | âœ… VERIFIED | 100% | Vercel dashboard + health endpoint confirmed |
| Commit is deployed | âœ… VERIFIED | 100% | 81fe5c0 confirmed in Vercel |
| Rate limiter working | âœ… VERIFIED | 100% | 429 response proves functionality |
| Schema validation | âœ… VERIFIED | 95% | Request passed rate limiter, must have passed schema |
| Registration error | âš ï¸ PARTIAL | 60% | Generic 400 response; root cause not exposed in HTTP response |

---

## Why the Error Is Masked

The HTTP 400 response returns a generic message:
```json
{
  "error": "An unexpected error occurred.",
  "code": "REGISTRATION_FAILED"
}
```

This is because the route handler catches all errors and sanitizes them:
```typescript
catch (error: unknown) {
  const message = error instanceof Error
    ? error.message
    : "An unexpected error occurred.";

  return NextResponse.json(
    { error: message, code: "REGISTRATION_FAILED" },
    { status: 400 }
  );
}
```

**The actual diagnostic information is logged to Vercel runtime logs** by the `registerOrganization()` function:
```typescript
function logRegistrationOperation(
  correlationId: string,
  operation: string,
  success: boolean,
  error?: unknown
) {
  // Logs operation name, success status, error code, status, and sanitized message
}
```

But Vercel Runtime Logs viewer shows no entries (feature not enabled or logs not persisting).

---

## Limitations of Current Investigation

1. **No access to Vercel runtime logs**
   - Cannot see the actual diagnostic error from `logRegistrationOperation()`
   - Cannot identify which operation failed (slug lookup, auth user creation, org insert, profile insert)
   - Cannot see the exact error code/message from Supabase

2. **No authenticated Vercel API access**
   - Cannot query Vercel API for deployment logs programmatically
   - Cannot access environment variable values to verify configuration

3. **Generic HTTP response**
   - Application intentionally masks internal errors
   - No correlation ID returned to link with logs
   - No detailed error information in response body

---

## Next Steps for Full Diagnosis

To determine the exact cause of the REGISTRATION_FAILED error:

### Option A: Vercel Dashboard Access (Recommended)
1. Log into Vercel dashboard with owner/admin account
2. Navigate to votehub-staging â†’ 9aqhZKodB deployment â†’ Logs
3. Search for the most recent request ~2026-09-01T11:06 UTC
4. Look for `console.error` output from `registerOrganization()`
5. Identify the failing `operation` and `message`

### Option B: Add Correlation ID to Response (Development Fix)
1. Modify the route to return the `correlationId` in the error response
2. Client can use it to search Vercel logs: "POST /api/auth/register [correlationId]"
3. This aids debugging without exposing error details

### Option C: Enable Vercel Error Tracking (Infrastructure)
1. Configure Vercel error tracking for this deployment
2. Ensure Runtime Logs are persisted
3. Set up external log aggregation (Datadog, Sentry, etc.)

---

## Test Artifacts

### Test Request
- **Email:** phase15test20260901110611@gmail.com
- **Organization:** Phase 15 Test Organization
- **Admin:** Phase 15 Administrator
- **Country:** GH | **Timezone:** Africa/Accra
- **Password:** (8+ chars, uppercase, lowercase, digits)

### Request Timeline
| Time (UTC) | Attempt | Status | Message |
|---|---|---|---|
| ~11:03 | 1st | 429 | Rate limit: 3335s retry-after |
| ~11:05 | 2nd | 429 | Rate limit: 274s retry-after |
| ~11:06 | 3rd | 400 | Registration logic error |

---

## Conclusion

**Phase 15 Registration Test Status: âŒ FAILED**

The deployment is **ready and healthy**, and the rate limiter successfully expired. However, **the registration request failed at the application logic layer** with HTTP 400.

**The exact cause cannot be determined without access to Vercel Runtime Logs.**

### Most Likely Root Cause (educated guess):
**Supabase Auth or database is not accessible or not properly configured in the staging deployment environment.**

This could be:
- Missing `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment
- Missing `DATABASE_URL` in Vercel environment
- Supabase Auth endpoint not reachable
- Database RLS policies blocking the insert
- Supabase tables missing or renamed

### Deployment Status:
- âœ… Vercel deployment: READY
- âœ… Commit deployed: 81fe5c0
- âœ… Health endpoint: Healthy
- âœ… Rate limiter: Working
- âŒ Registration endpoint: FAILING (application logic error)

### Verification Needed:
To complete Phase 15 registration test successfully, the underlying registration logic error must be diagnosed and fixed. This requires:
1. Vercel Runtime Logs access
2. Or: Supabase/Database configuration audit in staging environment
3. Or: Application error tracking system (Sentry, Datadog, etc.)

---

**Report Author:** Automated Phase 15 Diagnostic System
**Report Status:** AWAITING_ROOT_CAUSE_ANALYSIS
