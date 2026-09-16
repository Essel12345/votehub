# PHASE 15 REGISTRATION ROOT CAUSE AUDIT

**Status:** âŒ FAILED (HTTP 400)
**Date:** 2026-09-01 ~11:06 UTC
**Deployment:** votehub-staging (commit 81fe5c0)
**Test:** POST /api/auth/register with schema-validated payload
**Response:** `{"error":"An unexpected error occurred.","code":"REGISTRATION_FAILED"}`

---

## EXECUTIVE SUMMARY

The Phase 15 registration test **successfully passed rate-limiting and schema validation** but **failed in the application logic layer** during the `registerOrganization()` function. The generic error message indicates an unhandled exception that was not properly typed as an Error instance.

**Root Cause Analysis suggests: Supabase Auth client initialization failure (missing or invalid SUPABASE_SERVICE_ROLE_KEY) OR database schema mismatch (organizations table missing expected columns).**

---

## SECTION 1: REGISTRATION CODE FLOW ANALYSIS

### Operation Sequence

```
POST /api/auth/register
  â†“
[1] Rate Limit Check (PASSED âœ…)
  â†“
[2] JSON Parse (PASSED âœ…)
  â†“
[3] Schema Validation (PASSED âœ…)
  â†’ registerSchema.safeParse(body) = success
  â†“
[4] Call registerOrganization(payload, correlationId)
  â”œâ”€ [4a] Validate payload with registerSchema.parse(data)
  â”œâ”€ [4b] Ensure unique organization slug
  â”œâ”€ [4c] Create Supabase Auth user
  â”œâ”€ [4d] Insert organization record
  â””â”€ [4e] Insert profile record
  â†“
[ERROR] âŒ Exception thrown from registerOrganization()
  â†“
Catch block: error instanceof Error check
  â†’ Error thrown (error.message = actual error)
  â†’ Error NOT typed as Error (generic message used)
  â†“
HTTP 400 response with sanitized error
```

### Detailed Operation Breakdown

#### [4a] Payload Validation
- **Code:** `registerSchema.parse(data)` (sync, throws if invalid)
- **Status:** MUST HAVE PASSED (request made it to registerOrganization)
- **Validation:** All required fields present and formatted correctly

#### [4b] Organization Slug Lookup
```typescript
async function ensureUniqueOrganizationSlug(baseName: string, correlationId: string): Promise<string> {
  const supabase = await createClient();  // â† Server client (ANON_KEY)
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    logRegistrationOperation(correlationId, "organization slug lookup", false, error);
    throw error;  // â† Would be caught by route handler
  }
  return slug;
}
```

**Client Used:** `createClient()` (Server client with ANON_KEY)
**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` âœ… (documented as configured)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` âœ… (documented as configured)

**Database Requirements:**
- `organizations` table exists
- `slug` column exists and is queryable
- RLS policy allows SELECT for anon key (or RLS is disabled)

**Possible Failure Modes:**
1. âŒ `slug` column doesn't exist (PostgreSQL column not found error)
2. âŒ RLS policy blocks SELECT (Supabase permission error)
3. âŒ Network/timeout error

---

#### [4c] Supabase Auth User Creation
```typescript
const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { ... }
});

if (authError || !authData.user) {
  logRegistrationOperation(correlationId, "Supabase Auth user creation", false, authError);
  throw new Error(authError?.message ?? "Unable to create user account.");  // â† Throws Error
}
```

**Client Used:** `adminClient` (Service Role Key)
**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` âœ… (documented as configured)
- `SUPABASE_SERVICE_ROLE_KEY` âš ï¸ (documented as configured, but NOT verified)

**Supabase Requirements:**
- Auth is enabled in Supabase project
- Service role key is valid and active
- Email is not already registered
- Password meets Supabase Auth requirements

**Possible Failure Modes:**
1. âŒ **SUPABASE_SERVICE_ROLE_KEY missing in Vercel environment** (most likely)
   - Would cause: adminClient initialization failure OR auth API rejection
   - Result: Error with message "Unable to create user account."
   - Symptom: Generic error message in HTTP response

2. âŒ **SUPABASE_SERVICE_ROLE_KEY invalid or expired**
   - Would cause: 401/403 from Supabase Auth API
   - Result: authError set, throws Error

3. âŒ Email already exists
   - Would cause: Supabase returns error "User already exists"
   - Result: authError set, throws Error
   - Unlikely: timestamp ensures unique email

4. âŒ Password doesn't meet requirements
   - Would cause: Validation error from Supabase
   - Unlikely: client-side schema validates

---

#### [4d] Organization INSERT
```typescript
const { data: organization, error: organizationError } = await supabase
  .from("organizations")
  .insert(organizationPayload)  // â† Inserts: name, slug, country, timezone, status, description, website, contact_email, contact_phone
  .select()
  .single();

if (organizationError || !organization) {
  logRegistrationOperation(correlationId, "organization INSERT", false, organizationError);
  throw new Error("Unable to create organization record.");
}
```

**Client Used:** `createClient()` (Server client with ANON_KEY)
**Payload Fields:**
- `name` (string)
- `slug` (string)
- `country` (string)
- `timezone` (string)
- `status` (string: "PENDING")
- `description` (string)
- `website` (string or null)
- `contact_email` (string or null)
- `contact_phone` (string or null)

**Database Requirements:**
- `organizations` table has all payload fields as columns
- No unique constraint violations
- No NOT NULL violations
- RLS policy allows INSERT for anon key (or RLS is disabled)

**Critical Issue Found:** ðŸš¨
The Prisma schema and migrations examined show:
- Init migration (20260712081721): Creates organizations with only `id (INT)`, `name`, `description`, `createdAt`
- Latest migration (20260818_super_admin_setup): Only ALTERs to add `status` column

**Missing Columns in Prisma Schema:**
- âŒ `slug` (used by registration code, not in schema)
- âŒ `country` (used by registration code, not in schema)
- âŒ `timezone` (used by registration code, not in schema)
- âŒ `website` (used by registration code, not in schema)
- âŒ `contact_email` (used by registration code, not in schema)
- âŒ `contact_phone` (used by registration code, not in schema)

**Possible Failure Modes:**
1. âŒ **CRITICAL: Missing columns in organizations table**
   - Registration code tries to insert `slug`, `country`, `timezone`, `website`, `contact_email`, `contact_phone`
   - PostgreSQL returns error: `column "slug" of relation "organizations" does not exist`
   - Or similar for other missing columns
   - Result: organizationError set, throws "Unable to create organization record."
   - This would produce HTTP 400 response

2. âŒ Unique constraint on slug (if column exists)
   - Unlikely: slug generation includes suffix for uniqueness

3. âŒ RLS policy blocks INSERT
   - Would return permission denied error

---

#### [4e] Profile INSERT
```typescript
const { error: profileError } = await supabase.from("profiles").insert({
  id: authData.user.id,  // â† UUID from Auth
  email,
  full_name: ...,
  organization_id: organization.id,  // â† Would reference missing org if [4d] failed
  role: "ORGANIZATION_ADMIN",
  country,
  timezone,
  is_active: true,
});

if (profileError) {
  logRegistrationOperation(correlationId, "profile INSERT", false, profileError);
  throw new Error("Unable to create organization administrator profile.");
}
```

**Client Used:** `createClient()` (Server client with ANON_KEY)
**Database Requirements:**
- `profiles` table exists
- Foreign key to organizations exists
- Columns: id, email, full_name, organization_id, role, country, timezone, is_active

**Status:** Would not reach if [4d] fails

---

### Supabase Clients Used

| Operation | Client | Key Type | Required Env Var | Verification |
|-----------|--------|----------|------------------|--------------|
| Slug lookup | createClient() | Anonymous | NEXT_PUBLIC_SUPABASE_ANON_KEY | âœ… Configured |
| Auth user creation | adminClient | Service Role | SUPABASE_SERVICE_ROLE_KEY | âš ï¸ Unverified |
| Org INSERT | createClient() | Anonymous | NEXT_PUBLIC_SUPABASE_ANON_KEY | âœ… Configured |
| Profile INSERT | createClient() | Anonymous | NEXT_PUBLIC_SUPABASE_ANON_KEY | âœ… Configured |

**Critical Detail:** After creating Auth user with admin privileges, the code switches to anonymous client for database inserts. This creates an RLS challenge: how can an anonymous (unauthenticated) user insert into organizations and profiles tables?

---

## SECTION 2: SUPABASE CONFIGURATION AUDIT

### Organizations Table Schema

**Expected Schema (from registration code):**
```
organizations:
  - id (primary key, auto-increment or UUID)
  - name (string)
  - slug (string, unique)
  - country (string)
  - timezone (string)
  - status (string: ACTIVE, PENDING, SUSPENDED)
  - description (text)
  - website (text, nullable)
  - contact_email (text, nullable)
  - contact_phone (text, nullable)
  - created_at (timestamp)
  - updated_at (timestamp)
```

**Actual Schema (from Prisma migrations examined):**
```
organizations:
  - id (INT, primary key, auto-increment)
  - name (TEXT)
  - description (TEXT, nullable)
  - createdAt (TIMESTAMP)
  - status (VARCHAR(50), added in 20260818)

Columns MISSING from code path:
  - slug âŒ
  - country âŒ
  - timezone âŒ
  - website âŒ
  - contact_email âŒ
  - contact_phone âŒ
```

**Schema Verification:** âš ï¸ UNVERIFIED
- Prisma schema examined through migration files
- Actual Supabase database schema not verified via Supabase dashboard
- Possibility: Supabase tables were created outside Prisma migrations

### Profiles Table Schema

**Expected Schema (from registration code):**
```
profiles:
  - id (UUID, primary key, from auth.users)
  - email (text)
  - full_name (text)
  - organization_id (UUID, foreign key to organizations.id)
  - role (VARCHAR: ORGANIZATION_ADMIN, SUPER_ADMIN, etc.)
  - country (VARCHAR)
  - timezone (VARCHAR)
  - is_active (boolean)
  - created_at (TIMESTAMPTZ)
  - updated_at (TIMESTAMPTZ)
```

**Actual Schema (from latest migration 20260818):**
```
profiles:
  - id (UUID, primary key)
  - email (TEXT)
  - full_name (TEXT)
  - organization_id (UUID, FK to organizations.id)
  - role (VARCHAR(50), with CHECK constraint)
  - country (VARCHAR(255))
  - timezone (VARCHAR(50))
  - is_active (BOOLEAN, NOT NULL DEFAULT TRUE)
  - created_at (TIMESTAMPTZ, DEFAULT NOW())
  - updated_at (TIMESTAMPTZ, DEFAULT NOW())
```

**Schema Status:** âœ… MATCHES (profiles table is correct)

### RLS Policies for Profiles Table

**SELECT Policies:**
1. "Users can view their own profile" â€” auth.uid() = id âœ…
2. "Org admins can view org members" â€” Complex query checking admin role âœ…
3. "Super admins can view all profiles" â€” Role check âœ…

**INSERT Policies:** âŒ **NOT FOUND**
- Migration does not include INSERT policies for profiles
- Anonymous user (no auth.uid()) cannot insert via RLS

**UPDATE Policies:** âœ… Present (with role change restrictions)

### RLS for Organizations Table

**Status:** âŒ **RLS NOT ENABLED**
- Migration only adds status column
- No mention of enabling RLS
- No policies found in examined migrations

**Issue:** If RLS is not enabled on organizations, INSERT should work for anon key. If enabled without policies, INSERT will fail.

---

## SECTION 3: VERCEL ENVIRONMENT VARIABLES AUDIT

### Configuration Status

| Variable | Purpose | Required | Env Type | Deployment | Status |
|----------|---------|----------|----------|------------|--------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Yes | Public | âœ… Documented as configured | âš ï¸ Unverified in dashboard |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public anon key for client | Yes | Public | âœ… Documented as configured | âš ï¸ Unverified in dashboard |
| SUPABASE_SERVICE_ROLE_KEY | Privileged server key | Yes (for registration) | Secret | âš ï¸ Documented as configured | âŒ **NOT VERIFIED** |
| DATABASE_URL | Direct PostgreSQL connection | Maybe | Secret | â“ Unknown | â“ Unknown |
| RATE_LIMIT_BACKEND | Rate limiter type | Yes | Public | âœ… Working (observed in test) | âœ… Verified working |

### Critical Finding: SUPABASE_SERVICE_ROLE_KEY

**Documentation Status:** âœ… docs/STAGING_ENVIRONMENT_STATUS.md lists as "CONFIGURED"
**Verification Method:** NOT PERFORMED
- Vercel dashboard accessible but environment variables not inspected
- No browser tool access to secrets/environment page with values
- Per security policy, values must not be displayed

**Risk Assessment:** ðŸš¨ **HIGH**
- If SUPABASE_SERVICE_ROLE_KEY is missing or invalid, Auth user creation fails
- Admin client initialization in `src/lib/supabase/admin.ts` throws error if key missing
- Error would be caught by route handler and converted to generic message
- This matches observed HTTP 400 response

### RLS and Anonymous Access Problem

**Architecture Issue:**
1. Auth user created with admin client (privileged)
2. Organization inserted by anonymous client (unprivileged)
3. Organizations table RLS status unknown
4. If RLS enabled without INSERT policy for anon, insert fails

---

## SECTION 4: PARTIAL TEST RECORDS AUDIT

### Test User Email
```
phase15test20260901110611@gmail.com
```

### Search Results

**Status:** âŒ **CANNOT SEARCH**
- No direct Supabase dashboard access provided
- No Prisma seed or introspection tool available
- DATABASE_URL not set in local environment

**Expected Records (if registration succeeded):**
1. Auth user in `auth.users` with email `phase15test20260901110611@gmail.com`
2. Organization record in `organizations` table
3. Profile record in `profiles` table with id = auth.users.id

**Actual Records:** â“ UNKNOWN

### Inference

Given that HTTP 400 was returned (not 500), and registration code reaches error handling:

**Possibility A: Auth user creation failed**
- Auth user: âŒ Does NOT exist
- Organization: âŒ Does NOT exist
- Profile: âŒ Does NOT exist
- Failure point: [4c]

**Possibility B: Organization insert failed**
- Auth user: âœ… EXISTS (created successfully)
- Organization: âŒ Does NOT exist (insert failed)
- Profile: âŒ Does NOT exist (not attempted)
- Failure point: [4d]
- Issue: Missing columns or RLS policy

**Possibility C: Profile insert failed**
- Auth user: âœ… EXISTS
- Organization: âœ… EXISTS
- Profile: âŒ Does NOT exist (insert failed)
- Failure point: [4e]
- Issue: RLS policy or FK constraint

**Diagnostic Clue:** If auth user exists but org/profile don't, deletion of auth user might be needed (depending on whether auth.users is linked to organizations via FK).

---

## SECTION 5: ROOT CAUSE RANKING

### Ranked Causes (by likelihood)

#### ðŸ¥‡ RANK 1 (HIGH CONFIDENCE): Missing or Invalid SUPABASE_SERVICE_ROLE_KEY
**Confidence:** 70%

**Evidence:**
- Admin client initialized in `src/lib/supabase/admin.ts` throws at module load if key missing
- But error only appears at runtime when Auth user creation attempted
- Response is generic "An unexpected error occurred"
- Documentation says "configured" but never verified in Vercel dashboard
- Previous Phase 15 reports mentioned environment uncertainties

**Failure Point:** [4c] Auth user creation
**HTTP Response:** 400 âœ… Matches
**Generic Message:** Yes âœ… Matches (authError not typed as Error)

**Test Code:**
```typescript
const { data: authData, error: authError } = await adminClient.auth.admin.createUser({...});
if (authError || !authData.user) {
  throw new Error(authError?.message ?? "Unable to create user account.");
}
```
If adminClient is undefined or broken, authError would be set to undefined/null and the catch-all "Unable to create user account." is thrown.

---

#### ðŸ¥ˆ RANK 2 (MEDIUM CONFIDENCE): Missing Columns in Organizations Table
**Confidence:** 55%

**Evidence:**
- Prisma migrations show organizations table with only: id, name, description, createdAt, status
- Registration code tries to insert: name, slug, country, timezone, status, description, website, contact_email, contact_phone
- `slug` column not found in any examined migration file
- Database schema inference through Prisma may be incomplete
- Supabase tables may exist outside Prisma (created via Supabase UI)

**Failure Point:** [4d] Organization INSERT
**HTTP Response:** 400 âœ… Matches
**Generic Message:** Yes âœ… Matches

**Test Code:**
```typescript
const { data: organization, error: organizationError } = await supabase
  .from("organizations")
  .insert(organizationPayload)
  .select()
  .single();
if (organizationError || !organization) {
  throw new Error("Unable to create organization record.");  // â† Generic message matches
}
```

**PostgreSQL Error Example:**
```
error: column "slug" of relation "organizations" does not exist
```

---

#### ðŸ¥‰ RANK 3 (MEDIUM CONFIDENCE): RLS Policy Blocking Anonymous INSERT
**Confidence:** 40%

**Evidence:**
- Organizations table INSERT policy not found in migrations
- Anonymous client (anon key) used to insert into organizations
- Supabase RLS may block anonymous INSERT if enabled without policies
- Profiles table missing INSERT policies

**Failure Point:** [4d] Organization INSERT OR [4e] Profile INSERT
**HTTP Response:** 400 âœ… Matches
**Generic Message:** Yes âœ… Matches

**Supabase Error Example:**
```
error: new row violates row-level security policy for table "organizations"
```

---

#### 4ï¸âƒ£ RANK 4 (LOW CONFIDENCE): Slug Lookup Failure
**Confidence:** 20%

**Evidence:**
- Slug lookup is first database operation
- If `slug` column doesn't exist, this fails before Auth user creation
- But Auth user creation is more likely to be missing key rather than database
- Organization slug lookup uses SELECT which is less likely to fail than INSERT

**Failure Point:** [4b] Slug lookup
**HTTP Response:** 400 âœ… Matches
**Generic Message:** Yes âœ… Matches

---

#### 5ï¸âƒ£ RANK 5 (LOW CONFIDENCE): Email Already Exists
**Confidence:** 10%

**Evidence:**
- Timestamp ensures email uniqueness
- If email existed, Supabase would return specific error
- Error handling would throw typed Error
- Generic message suggests error is not properly typed

**Failure Point:** [4c] Auth user creation
**HTTP Response:** 400 âœ… Matches

---

### Most Likely Root Cause (Synthesized)

**PRIMARY CAUSE: Missing or Invalid SUPABASE_SERVICE_ROLE_KEY in Vercel staging environment**

**SECONDARY CAUSE: Missing slug (and other) columns in organizations table**

**IMPACT:** Either cause produces HTTP 400 with generic error message that matches observations.

---

## SECTION 6: RECOMMENDATIONS FOR MINIMAL FIX

### CRITICAL: Before Attempting Fix

1. âœ… **Do NOT retry registration** (would consume another rate limit window)
2. âœ… **Do NOT modify code** (per constraints)
3. âœ… **Do NOT deploy** (per constraints)
4. âœ… **Do NOT modify database** (per constraints)

### Investigation Steps (READ-ONLY)

**Step 1: Verify Environment Variables in Vercel**
- Access Vercel dashboard â†’ votehub-staging project â†’ Settings â†’ Environment Variables
- Verify that SUPABASE_SERVICE_ROLE_KEY is set (not empty)
- Verify that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set
- âœ… **Report:** CONFIGURED or MISSING (do not expose values)

**Step 2: Inspect Organizations Table Schema in Supabase**
- Access Supabase dashboard â†’ SQL Editor or Table editor
- Run: `SELECT column_name, column_type FROM information_schema.columns WHERE table_name = 'organizations' ORDER BY ordinal_position;`
- Verify columns: id, name, slug, country, timezone, status, description, website, contact_email, contact_phone
- âœ… **Report:** Which columns exist, which are missing

**Step 3: Check Supabase Auth Configuration**
- Verify Auth is enabled in Supabase project
- Verify service role key is valid (check in Supabase API settings)
- âœ… **Report:** Auth enabled or disabled

**Step 4: Review RLS Policies**
- Organizations table: Check if RLS enabled
- Profiles table: Check INSERT policies
- âœ… **Report:** RLS status and existing policies

### Recommended Fix (AFTER investigation)

**If SUPABASE_SERVICE_ROLE_KEY is missing:**
1. Obtain the service role key from Supabase
2. Add to Vercel environment variables (server-only)
3. Redeploy

**If columns are missing:**
1. Create migration to add missing columns to organizations table
2. Or: Modify registration code to only use existing columns
3. Deploy with migration

**If RLS is blocking:**
1. Create INSERT policy for organizations table allowing anon key under certain conditions
2. Create INSERT policy for profiles table
3. Or: Disable RLS if not needed for anonymous registrations

---

## SECTION 7: CONFIDENCE LEVELS & EVIDENCE SUMMARY

| Finding | Evidence Quality | Confidence |
|---------|-----------------|------------|
| Rate limiter works | âœ… Observed 429 â†’ expired | 100% |
| Schema validation works | âœ… Request passed validation | 95% |
| HTTP 400 not 500 | âœ… Observed response | 100% |
| Generic error message | âœ… Observed in response | 100% |
| Auth user creation attempted | âœ… Code path shows it's called | 95% |
| Service role key missing | âš ï¸ Documented as configured, not verified | 70% |
| Organizations table has slug | âŒ Not found in migrations examined | 45% (inverse: slug missing = 55%) |
| RLS policies incomplete | âš ï¸ INSERT policies not visible in examined migrations | 60% |
| Vercel has environment configured | âœ… Documentation, not verified | 85% |

---

## SECTION 8: DEPLOYMENT HEALTH SUMMARY

| Component | Status | Evidence |
|-----------|--------|----------|
| Vercel deployment | âœ… READY | Dashboard shows READY status |
| Commit 81fe5c0 | âœ… DEPLOYED | Verified in deployment details |
| /api/health endpoint | âœ… HTTP 200 | Previous test returned healthy status |
| Rate limiter | âœ… WORKING | 429 responses observed |
| Rate limiter window | âœ… EXPIRED | 429 â†’ 400 transition observed |
| Schema validation | âœ… WORKING | Request passed validation |
| Registration endpoint | âŒ FAILING | HTTP 400 error |
| Supabase (services) | â“ UNKNOWN | Health status not independently verified |
| Database (organizations) | â“ UNKNOWN | Schema not verified in Supabase |
| Database (profiles) | âœ… LIKELY OK | Schema appears correct in migrations |
| Auth (Supabase) | â“ UNKNOWN | Service role key status not verified |

---

## FINAL ASSESSMENT

**Test Status:** âŒ **FAILED**
**Deployment Status:** âœ… **READY** (but with application logic failures)
**Root Cause:** ðŸ”´ **IDENTIFIED (but not proven)**

### Most Likely Scenario (70% confidence):

The Vercel staging deployment has one or both of:
1. Missing `SUPABASE_SERVICE_ROLE_KEY` environment variable
2. Organizations table missing required columns (slug, country, timezone, website, contact_email, contact_phone)

Either condition causes the registration service to fail with HTTP 400 when attempting to create the Auth user or insert the organization record.

### To Complete Phase 15:

1. Verify SUPABASE_SERVICE_ROLE_KEY is configured in Vercel
2. Verify organizations table schema matches registration code expectations
3. Ensure RLS policies (if enabled) allow necessary database operations
4. Deploy fixes (if needed) without modifying registration code
5. Retry registration test

---

**Audit Completed:** 2026-09-01 11:30 UTC
**Status:** Ready for investigation and remediation
**Next Step:** Verify environment variables and database schema in Supabase dashboard
