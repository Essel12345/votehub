# Rate Limiting Implementation

**VoteHub Production Rate Limiting System**

---

## Overview

VoteHub implements comprehensive rate limiting to protect against:
- Brute force attacks (login attempts)
- Denial of Service (DoS) attacks
- API abuse
- Enumeration attacks (voter lookups)
- Duplicate voting attempts
- Invitation spam

**Status**: ✅ Production-ready for a single application instance; multi-instance deployment remains blocked until a shared backend is implemented.

---

## Architecture

### Storage Backend

**Current**: In-memory rate limiting (single instance)
**Production**: Requires external backend for multi-instance deployments

#### Single Instance Deployment
- Uses in-memory Map-based storage
- Automatic cleanup of expired entries every 60 seconds
- Suitable for: Single server, staging, development
- No external dependencies required

#### Multi-Instance Deployment (Not Yet Supported)
For deployments across multiple server instances, implement and test a shared backend before production use:

1. **Redis** (Recommended)
   - Set `REDIS_URL` environment variable
   - Shared state across instances
   - Automatic TTL/expiration
   - High performance

2. **Distributed Cache** (AWS ElastiCache, Memcached)
   - Add adapter in rate-limit.service.ts
   - Requires additional configuration

**NOTE**: Current implementation uses in-memory storage. For production multi-instance deployments:
1. Install Redis: `npm install redis`
2. Create Redis adapter in rate-limit.service.ts
3. Configure REDIS_URL environment variable
4. See [Multi-Instance Deployment](#multi-instance-deployment) below

---

## Rate Limit Configuration

### By Endpoint Type

#### 1. Authentication Endpoints
```
Endpoint: POST /api/auth/register
Limit: 5 per 15 minutes per IP
Identifier: Client IP address
Purpose: Prevent brute-force registration attacks
Response: HTTP 429 with Retry-After header
```

#### 2. Login Attempts
```
Endpoint: POST /api/auth/login (if implemented)
Limit: 5 per 15 minutes per IP
Identifier: Client IP address
Purpose: Prevent credential brute-forcing
Response: HTTP 429
Note: Returns generic error (doesn't reveal if email exists)
```

#### 3. Ballot Submission
```
Endpoint: POST /api/elections/{id}/ballot (conceptual)
Limit: 1 per 1 hour per voter per election
Identifier: User ID + Election ID
Purpose: Additional layer on top of database-level duplicate prevention
Response: HTTP 429
Security: Rate limiting is supplementary; database prevents actual duplicates
```

#### 4. Voter Lookup/Search
```
Endpoint: GET /api/voters/search (if implemented)
Limit: 10 per 1 minute per IP
Identifier: Client IP address
Purpose: Prevent voter enumeration attacks
Response: HTTP 429
Note: Returns generic "too many requests" without details
```

#### 5. Admin API (General)
```
Endpoints: /api/admin/*
Limit: 100 per 1 minute per authenticated user
Identifier: User ID (authenticated requests only)
Purpose: Protect admin operations from abuse
Response: HTTP 429
Authorization: SUPER_ADMIN role required (checked after rate limit)
```

#### 6. Admin API (Sensitive Operations)
```
Endpoints: 
  - POST /api/admin/users/{id}/role (role changes)
  - POST /api/admin/organizations/{id}/suspend
  - POST /api/admin/elections/{id}/open
  - POST /api/admin/elections/{id}/close
Limit: 10 per 1 minute per authenticated user
Identifier: User ID
Purpose: Stricter protection for sensitive operations
Response: HTTP 429
Note: Can be configured per-endpoint for maximum flexibility
```

#### 7. Invitations
```
Endpoint: POST /api/invitations/send (conceptual)
Limit: 20 per 1 hour per user
Identifier: User ID (authenticated)
Purpose: Prevent invitation spam
Response: HTTP 429
Note: Includes Retry-After header with retry time
```

### Configuration Object

Located in: `src/lib/security/rate-limit.service.ts`

```typescript
export const RATE_LIMIT_CONFIG = {
  LOGIN: {
    limit: 5,
    window: 15 * 60 * 1000,        // 15 minutes in milliseconds
    identifier: "ip",              // "ip" | "user" | "user+election"
    description: "Login attempts: 5 per 15 minutes per IP",
  },
  // ... more endpoints
};
```

**To customize limits**:
1. Edit `src/lib/security/rate-limit.service.ts`
2. Modify `RATE_LIMIT_CONFIG` values
3. Rebuild and redeploy
4. No code changes needed in endpoint handlers

---

## Usage

### Basic Usage in API Endpoints

```typescript
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function POST(request: NextRequest) {
  // Apply rate limiting (5 registrations per hour per IP)
  const rateLimitResult = await applyRateLimit(request, "REGISTER");
  
  if (!rateLimitResult.allowed) {
    // Return 429 Too Many Requests with Retry-After
    return rateLimitResult.response!;
  }

  // Handler logic continues...
  try {
    // Process request
    return NextResponse.json({ success: true });
  } catch (error) {
    // Error handling
  }
}
```

### Custom Identifier

For endpoints that need custom rate-limit identification:

```typescript
// Rate limit by user + election combination
const identifier = `${userId}:${electionId}`;
const rateLimitResult = await applyRateLimit(
  request,
  "BALLOT_SUBMIT",
  identifier  // Override auto-detection
);
```

### Advanced: Check Without Blocking

```typescript
import { checkRateLimit } from "@/lib/security/rate-limit.service";

const { allowed, resetAfter } = await checkRateLimit(
  request,
  "LOGIN",
  ipAddress
);

if (!allowed) {
  // Custom response logic
  return NextResponse.json(
    { error: "Too many requests. Try again in ${resetAfter} seconds." },
    { status: 429, headers: { "Retry-After": resetAfter.toString() } }
  );
}
```

---

## IP Detection

### Trusted Headers (Checked in Order)

1. **CF-Connecting-IP** - Cloudflare
2. **X-Forwarded-For** - Standard proxy header (uses first IP in chain)
3. **X-Real-IP** - nginx reverse proxy
4. **Direct connection** - Fallback (may not work in serverless)

### For Reverse Proxies/Load Balancers

Update `getClientIp()` in `rate-limit.service.ts` for your infrastructure:

```typescript
export function getClientIp(request: NextRequest): string {
  // Your trusted proxy headers here
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;
  // ... more checks
  return "unknown";
}
```

**WARNING**: Do not blindly trust arbitrary client-supplied headers. Only trust headers from your known infrastructure (Cloudflare, AWS ALB, nginx, etc.).

---

## Response Format

### Rate Limited (HTTP 429)

```json
{
  "error": "Too many requests",
  "message": "Login attempts: 5 per 15 minutes per IP",
  "retryAfter": 300
}
```

### Response Headers

```
HTTP/1.1 429 Too Many Requests
Retry-After: 300
X-RateLimit-Limit: 5
X-RateLimit-Window: 900
X-RateLimit-Reset: 2026-08-18T12:15:00Z
```

**Header Meanings**:
- `Retry-After`: Seconds to wait before retrying (also in body)
- `X-RateLimit-Limit`: Max requests allowed in window
- `X-RateLimit-Window`: Window size in seconds
- `X-RateLimit-Reset`: ISO timestamp when limit resets

---

## Security Considerations

### 1. Duplicate Vote Prevention

**IMPORTANT**: Rate limiting does NOT replace duplicate vote prevention.

The voting system prevents duplicate votes via:
- Database constraint: `UNIQUE(election_voter_id, election_id)`
- Transactional integrity: Entire ballot creation is atomic
- Authorization checks: Verify voter eligibility
- Business logic: Check if voter already has ballot

Rate limiting (1 ballot per hour per user per election) is an **additional security layer**, not the primary mechanism.

### 2. Fail-Safe Behavior

If the rate-limit backend becomes unavailable:
- Requests are **allowed** (fail-open, not fail-closed)
- Error is logged silently
- System continues functioning
- Monitoring alert should trigger

**Rationale**: Brief rate-limit outage is better than service unavailability.

For sensitive operations, consider fail-closed. Example:

```typescript
// Sensitive admin operation
const result = await checkRateLimit(request, "ADMIN_SENSITIVE");
if (!result.allowed) {
  return rateLimitResponse;
}

// If result unavailable, optionally fail-closed:
// if (result.unknown) {
//   return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
// }
```

### 3. No Information Leakage

Rate limit responses do not expose:
- Whether email/account exists (for auth endpoints)
- Internal storage backend
- Implementation details
- Stack traces
- Service names

### 4. No Shared State Between Tenants

Multi-tenant isolation is maintained:
- Organization A's rate limit doesn't affect Organization B
- Use organization-aware identifiers when needed
- Example: `${userId}:${electionId}` prevents cross-org issues

---

## Testing

### Run Rate Limit Tests

```bash
npm test -- src/lib/security/rate-limit.service.test.ts
```

### Test Coverage

Tests verify:
- ✅ Login allows 5, blocks 6th request
- ✅ Different IPs have separate limits
- ✅ Ballot submission prevents duplicates within window
- ✅ Voter lookup respects 10/min limit
- ✅ Admin APIs respect 100/min limit
- ✅ 429 responses with correct headers
- ✅ Retry-After calculated correctly
- ✅ IP detection from various headers
- ✅ Multi-tenant isolation
- ✅ Concurrent request handling
- ✅ Fail-safe on backend errors

### Manual Testing

```bash
# Test login rate limit
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done
# First 5 succeed, 6th returns 429

# Check Retry-After header
curl -I -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Should include: Retry-After: XXX
```

---

## Production Deployment

### Single Instance (Staging/Demo)

1. Uses built-in in-memory storage
2. No additional configuration needed
3. Automatic cleanup
4. Suitable for: Single server deployments

### Multi-Instance (AWS ECS, Kubernetes, etc.)

**Required**: Configure external rate-limit backend

#### Option 1: Redis (Recommended)

1. **Set up Redis**:
   ```bash
   # AWS ElastiCache, Docker, or managed Redis
   export REDIS_URL="redis://localhost:6379"
   ```

2. **Update rate-limit.service.ts** (stub):
   ```typescript
   // TODO: Implement Redis adapter when deployed with multiple instances
   // const redis = await createRedisClient(process.env.REDIS_URL);
   // Use redis.increment(), redis.expire() for rate limiting
   ```

3. **Install Redis client**:
   ```bash
   npm install redis
   ```

#### Option 2: AWS DynamoDB

Create adapter for DynamoDB (similar pattern to Redis):
- Use `RateLimitKey` (hash key) + `ExpiresAt` (TTL)
- Increment counter with `UpdateItem`
- Check count before allowing request

#### Option 3: Supabase (Quick Start)

```typescript
// Store in rate_limit_store table
// Use RLS policies to keep counts separate per IP/user
// Perform cleanup: DELETE WHERE expires_at < NOW()
```

### Environment Variables

```bash
# Optional: Redis for multi-instance deployments
REDIS_URL=redis://cache.region.amazonaws.com:6379

# Optional: Custom rate limits (via code changes, not env)
# RATE_LIMIT_LOGIN_COUNT=5
# RATE_LIMIT_LOGIN_WINDOW=900
```

### Monitoring

Set up alerts for:
- Rate limit hits (unusual traffic patterns)
- Rate limit backend failures (unavailable Redis/cache)
- Spike in 429 responses

Example CloudWatch alarm:
```
Metric: HTTPStatus429Count
Condition: > 100 per minute
Action: Notify ops team
```

---

## Troubleshooting

### Issue: All Requests Returning 429

**Cause**: Rate limit window too small or limit set too low

**Fix**:
1. Check `RATE_LIMIT_CONFIG` values
2. Increase limit or window
3. Verify identifier detection is working

### Issue: Different Users Sharing Limit

**Cause**: Identifier detection not working (IP "unknown")

**Fix**:
1. Verify proxy headers are being sent
2. Update `getClientIp()` for your infrastructure
3. Check X-Forwarded-For header is set by load balancer

### Issue: Rate Limit Not Resetting

**Cause**: In-memory cleanup not running or Redis persistence issue

**Fix**:
1. Check Node.js process hasn't crashed
2. Verify Redis (if using)
3. Wait for window expiry (worst case: ~15 minutes for login)

### Issue: Performance Degradation

**Cause**: Rate limit checks too expensive

**Fix**:
1. Ensure using Redis (not in-memory) for multi-instance
2. Add caching for valid requests (whitelist trusted IPs)
3. Reduce complexity of identifier detection

---

## Implementation Roadmap

### Phase 1: ✅ COMPLETE
- [x] In-memory rate limiter
- [x] Core endpoint protection (login, registration, admin)
- [x] IP detection with trusted headers
- [x] Proper error responses and headers
- [x] Comprehensive test suite
- [x] Documentation

### Phase 2: TODO (Multi-Instance)
- [ ] Redis adapter implementation
- [ ] Environment variable detection
- [ ] Connection pooling
- [ ] Health checks for Redis backend

### Phase 3: TODO (Advanced)
- [ ] Per-endpoint fine-tuning UI
- [ ] Rate limit analytics dashboard
- [ ] Automatic limits based on traffic patterns
- [ ] Distributed tracing for rate-limit decisions
- [ ] User whitelisting (critical admins)

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/security/rate-limit.service.ts` | Core rate limiting implementation |
| `src/lib/security/rate-limit.service.test.ts` | Comprehensive test suite (40+ tests) |
| `src/app/api/auth/register/route.ts` | Example: Registration with rate limiting |
| `src/app/api/admin/**/route.ts` | Admin endpoints with rate limiting |
| `docs/RATE_LIMITING.md` | This documentation |

---

## API Endpoints Protected

### Current

| Endpoint | Method | Limit | Window | Identifier |
|----------|--------|-------|--------|------------|
| `/api/auth/register` | POST | 5 | 1 hour | IP |
| `/api/admin/audit-logs` | GET | 100 | 1 minute | User |
| `/api/admin/dashboard/stats` | GET | 100 | 1 minute | User |
| `/api/admin/elections` | GET | 100 | 1 minute | User |
| `/api/admin/organizations/{id}` | GET | 100 | 1 minute | User |
| `/api/admin/security/events` | GET | 100 | 1 minute | User |

### Ready for Protection (Add When Needed)

- Ballot submission (when endpoint created)
- Voter lookup/search (when endpoint created)
- Invitation sending (when endpoint created)
- Sensitive admin operations (role changes, suspensions)

---

## Conclusion

VoteHub rate limiting provides **production-ready single-instance** protection with:

- ✅ Flexible configuration
- ✅ In-memory storage with automatic cleanup
- ✅ Proper error handling
- ✅ Comprehensive documentation
- ✅ Extensive test coverage
- ✅ Security-first design

**Next step**: Integrate and test Redis before deploying more than one application instance.

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-18  
**Status**: Production Ready for single-instance deployment
