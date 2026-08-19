# Phase 13: End-to-End Testing & Security Hardening Test Plan

**Date**: 2026-08-18  
**Project**: VoteHub Multi-Tenant Election Platform  
**Version**: 0.1.0  

## Executive Summary

This document outlines the comprehensive test plan for Phase 13, designed to:
1. Verify all authentication and authorization mechanisms work correctly
2. Ensure multi-tenant security isolation is enforced at all layers
3. Test the complete election lifecycle and voting workflow
4. Validate data privacy and audit controls
5. Identify and fix security vulnerabilities
6. Establish a security test matrix for future regression testing

## Test Environment

### Database
- PostgreSQL with Supabase backend
- RLS (Row Level Security) enabled on sensitive tables
- All test data is synthetic and never contains real voter information

### Test Organizations
- **Organization A**: Testing organization 1
- **Organization B**: Testing organization 2 (for cross-tenant testing)

### Test Users

| User | Role | Organization | Purpose |
|------|------|--------------|---------|
| super-admin@votehub.test | SUPER_ADMIN | None | Platform-level admin |
| admin-a@votehub.test | ORGANIZATION_ADMIN | Org A | Org A management |
| admin-b@votehub.test | ORGANIZATION_ADMIN | Org B | Org B management |
| officer-a@votehub.test | ELECTION_OFFICER | Org A | Election management |
| officer-b@votehub.test | ELECTION_OFFICER | Org B | Election management |
| candidate-a@votehub.test | CANDIDATE | Org A | Candidate testing |
| candidate-b@votehub.test | CANDIDATE | Org B | Candidate testing |
| voter-a@votehub.test | VOTER | Org A | Voter testing |
| voter-b@votehub.test | VOTER | Org B | Voter testing |

## Test Categories

### 1. Authentication Testing
- **Objective**: Verify login, registration, session management work correctly
- **Tests**:
  - [ ] User registration with valid credentials
  - [ ] User registration with invalid email format
  - [ ] User registration with password too short
  - [ ] User registration with existing email (duplicate)
  - [ ] User login with correct credentials
  - [ ] User login with incorrect password
  - [ ] User login with non-existent email
  - [ ] User logout clears session
  - [ ] Session persists across page refreshes
  - [ ] Expired session redirects to login
  - [ ] Protected routes reject unauthenticated users
  - [ ] API routes reject unauthenticated requests (no token)
  - [ ] API routes reject invalid tokens
  - [ ] Password reset flow works (if implemented)

**Success Criteria**: All tests pass. Protected routes return 401 for unauthenticated requests, never expose sensitive data in error messages.

---

### 2. Authorization Testing (Role-Based Access Control)

#### 2.1 SUPER_ADMIN Tests
- [ ] Can access /admin dashboard
- [ ] Can access /api/admin/* endpoints
- [ ] Can view all organizations
- [ ] Can view all users across organizations
- [ ] Can view platform-level audit logs
- [ ] Can manage system settings
- [ ] Can view system health status
- [ ] Cannot be restricted to single organization

#### 2.2 ORGANIZATION_ADMIN Tests (Org A Admin)
- [ ] Can access /dashboard
- [ ] Can view and manage Org A elections
- [ ] Can view Org A members
- [ ] Can view Org A audit logs
- [ ] CANNOT access Org B elections
- [ ] CANNOT access Org B members
- [ ] CANNOT access /admin routes
- [ ] CANNOT access /api/admin/* routes
- [ ] CANNOT view organization-level audit logs (platform-wide)
- [ ] CANNOT change own role
- [ ] CANNOT create SUPER_ADMIN role

#### 2.3 ELECTION_OFFICER Tests (Org A Officer)
- [ ] Can create elections in Org A
- [ ] Can edit elections in Org A
- [ ] Can manage positions in Org A elections
- [ ] Can manage candidates in Org A elections
- [ ] Can manage voters in Org A elections
- [ ] Can open/close elections in Org A
- [ ] CANNOT access Org B elections
- [ ] CANNOT create elections in Org B
- [ ] CANNOT view /admin or /api/admin/*
- [ ] CANNOT change own role
- [ ] CANNOT promote other users
- [ ] CANNOT suspend elections (admin-only)

#### 2.4 CANDIDATE Tests (Org A Candidate)
- [ ] Can view their own candidate profile
- [ ] Can view elections they are running in
- [ ] CANNOT create elections
- [ ] CANNOT manage candidates
- [ ] CANNOT manage voters
- [ ] CANNOT view results until published
- [ ] CANNOT view audit logs
- [ ] CANNOT view organization settings
- [ ] CANNOT access other candidates' profiles (privacy)

#### 2.5 VOTER Tests (Org A Voter)
- [ ] Can view Org A elections
- [ ] Can view published election information
- [ ] Can vote in open elections (if eligible)
- [ ] CANNOT create elections
- [ ] CANNOT view unpublished results
- [ ] CANNOT view other voters' ballots
- [ ] CANNOT view audit logs
- [ ] CANNOT manage candidates
- [ ] CANNOT access /admin or /api/admin/*

**Success Criteria**: All role-based restrictions enforced. No privilege escalation possible. Least privilege principle demonstrated.

---

### 3. Multi-Tenant Security Testing (CRITICAL)

#### 3.1 Organization Isolation
- [ ] Org A Admin cannot view Org B's elections
- [ ] Org A Admin cannot edit Org B's elections
- [ ] Org A Admin cannot delete Org B's elections
- [ ] Org A Admin cannot view Org B's members
- [ ] Org A Admin cannot view Org B's voters
- [ ] Org A Admin cannot view Org B's candidates
- [ ] Org A Admin cannot view Org B's results
- [ ] Org A Admin cannot view Org B's audit logs
- [ ] Org A Officer cannot manage Org B's elections
- [ ] Org A Voter cannot vote in Org B elections

#### 3.2 API Isolation (IDOR Testing)
- [ ] Attempting to change election ID in URL to Org B election → 401/403
- [ ] Attempting to change voter ID in URL to Org B voter → 401/403
- [ ] Attempting to change candidate ID in URL to Org B candidate → 401/403
- [ ] Attempting to change organization ID in URL to Org B → 401/403
- [ ] Attempting to access Org B audit logs via API → 401/403
- [ ] Attempting to access Org B templates via API → 401/403
- [ ] Attempting to access Org B notifications via API → 401/403
- [ ] PUT/PATCH requests for cross-org resources → rejected

#### 3.3 Request Body Injection
- [ ] User submits Org B organization_id in election creation → uses user's org
- [ ] User submits Org B organization_id in voter import → uses user's org
- [ ] User submits Org B organization_id in candidate submission → uses user's org
- [ ] Server rejects organization_id override attempts

**Success Criteria**: Zero cross-tenant access possible. All attempts logged. Unauthorized requests return safe error messages.

---

### 4. Election Lifecycle Testing

#### 4.1 Valid State Transitions
- [ ] DRAFT → SCHEDULED
- [ ] SCHEDULED → OPEN
- [ ] OPEN → CLOSED
- [ ] CLOSED → RESULTS_READY
- [ ] RESULTS_READY → PUBLISHED
- [ ] PUBLISHED → ARCHIVED
- [ ] DRAFT → ARCHIVED (direct archive)

#### 4.2 Invalid State Transitions (Must Fail)
- [ ] DRAFT → OPEN (skip SCHEDULED)
- [ ] DRAFT → CLOSED
- [ ] CLOSED → OPEN
- [ ] OPEN → DRAFT
- [ ] ARCHIVED → OPEN
- [ ] ARCHIVED → DRAFT
- [ ] PUBLISHED → OPEN
- [ ] PUBLISHED → DRAFT
- [ ] Invalid state value submitted

#### 4.3 Transition Preconditions
- [ ] Cannot transition to PUBLISHED without calculating results
- [ ] Cannot transition to SCHEDULED if start date is in past
- [ ] Cannot transition to OPEN if scheduled start time is future
- [ ] Cannot transition to CLOSED if no votes received (allow, but note edge case)
- [ ] Attempting to close before scheduled end time → allowed with warning

**Success Criteria**: All valid transitions work. All invalid transitions rejected. Preconditions enforced.

---

### 5. Voting Workflow Testing

#### 5.1 Valid Vote Submission
- [ ] Voter opens election
- [ ] Voter sees all positions and candidates
- [ ] Voter selects candidate for each position (as required)
- [ ] Voter submits ballot
- [ ] Ballot is stored in database
- [ ] Voter receives confirmation
- [ ] Vote appears in results (private count, not individual ballot)

#### 5.2 Vote Restrictions
- [ ] Voter cannot vote before election opens
- [ ] Voter cannot vote after election closes
- [ ] Voter cannot vote in election they're not eligible for
- [ ] Voter cannot vote twice in same election
- [ ] Voter cannot submit partial ballot (if required fields exist)
- [ ] Voter cannot select more candidates than allowed
- [ ] Voter cannot select same candidate twice (if not allowed)

#### 5.3 Ballot Creation
- [ ] Each ballot gets unique reference number
- [ ] Ballot timestamp recorded correctly
- [ ] Ballot status set to SUBMITTED
- [ ] Ballot_selections linked correctly
- [ ] Voter_id NOT stored with ballot (privacy)

#### 5.4 Double-Submit Prevention
- [ ] Double-click during submission → only one ballot created
- [ ] Two rapid API requests → only one ballot created
- [ ] Refresh during submission → idempotent (doesn't duplicate)
- [ ] Parallel requests from two tabs → only one succeeds

**Success Criteria**: All valid votes accepted. All invalid votes rejected safely. No duplicate ballots. Vote privacy maintained.

---

### 6. Ballot Privacy Testing

#### 6.1 Data Isolation
- [ ] Raw ballots table not readable by ordinary users
- [ ] Ballot_selections table not readable by ordinary users
- [ ] Ballots not visible in notifications
- [ ] Ballots not exposed in audit logs (except vote count)
- [ ] Candidate cannot see individual votes for them
- [ ] Organization admin cannot see individual ballots
- [ ] Results show only aggregate counts

#### 6.2 Information Disclosure
- [ ] API does not return ballot.voter_id with selections
- [ ] API does not return ballot_selections.candidate_id details
- [ ] Notifications do not include vote selections
- [ ] Audit logs do not include ballot contents
- [ ] Election results show only aggregate counts
- [ ] URLs do not contain vote selections
- [ ] Response bodies do not unnecessarily expose voter identity + selections together

**Success Criteria**: Individual ballot selections never disclosed to unauthorized users. Results always aggregate only.

---

### 7. Results Calculation Testing

#### 7.1 Accuracy
- [ ] Results match actual votes (vote count verification)
- [ ] Tie detection works correctly
- [ ] Invalid ballots excluded from count
- [ ] Abstentions handled correctly
- [ ] Percentage calculations accurate to 2 decimals
- [ ] Turnout calculation correct

#### 7.2 State Constraints
- [ ] Results cannot be calculated before CLOSED state
- [ ] Results cannot be published before RESULTS_READY state
- [ ] Published results read-only (no recalculation)
- [ ] Changing published election → error (audit trail)

#### 7.3 Privacy
- [ ] Results do not expose individual voter choices
- [ ] Results do not expose voter participation list
- [ ] Results show only aggregate per-candidate votes
- [ ] Candidate does not see individual votes for them

**Success Criteria**: Results accurate. State properly enforced. Privacy maintained.

---

### 8. Notification Testing

#### 8.1 Delivery
- [ ] User receives invitation notification when invited
- [ ] User receives election published notification
- [ ] User receives election opened notification
- [ ] Candidate receives approval notification
- [ ] Candidate receives rejection notification
- [ ] Election administrator receives election published confirmation

#### 8.2 Isolation
- [ ] Org A users don't receive Org B notifications
- [ ] Notifications filtered by organization_id
- [ ] Notification recipient cannot read others' notifications
- [ ] Notification preferences respected per user

#### 8.3 Privacy
- [ ] Notifications do not contain vote selections
- [ ] Notifications do not expose ballot details
- [ ] Notifications do not expose voter identity + voting confirmation together
- [ ] Email notifications sanitized (no PII if possible)

#### 8.4 Reliability
- [ ] Email delivery failure does not crash application
- [ ] Failed notification retries (if implemented)
- [ ] Notification deduplication (no duplicate messages)

**Success Criteria**: Correct notifications delivered to correct users. Organization isolation enforced. No sensitive data in notifications.

---

### 9. Audit Log Testing

#### 9.1 Coverage
- [ ] Login events logged
- [ ] Logout events logged
- [ ] Organization creation logged
- [ ] Organization changes logged
- [ ] Role changes logged
- [ ] Election creation logged
- [ ] Election state transitions logged
- [ ] Candidate approval/rejection logged
- [ ] Voter import logged
- [ ] Results publication logged
- [ ] Unauthorized access attempts logged
- [ ] Admin actions logged with Super Admin indicator

#### 9.2 Privacy
- [ ] Audit logs do NOT contain passwords
- [ ] Audit logs do NOT contain tokens
- [ ] Audit logs do NOT contain API keys
- [ ] Audit logs do NOT contain vote selections
- [ ] Audit logs do NOT contain full ballot contents
- [ ] Audit logs contain only action, actor, timestamp, resource type

#### 9.3 Organization Isolation
- [ ] Org A audit logs isolated from Org B
- [ ] Org A admin cannot view Org B audit logs
- [ ] Platform audit logs only visible to Super Admin
- [ ] Organization admin can view only their org's audit logs

**Success Criteria**: Critical events logged. Sensitive data excluded. Organization isolation enforced.

---

### 10. API Security Testing

#### 10.1 Authentication
- [ ] All protected endpoints require valid token
- [ ] Endpoints reject missing Authorization header
- [ ] Endpoints reject invalid tokens
- [ ] Endpoints reject expired tokens
- [ ] Public endpoints (login, register, public election) don't require token

#### 10.2 Authorization
- [ ] All endpoints verify user role
- [ ] All endpoints verify organization membership
- [ ] All endpoints verify resource ownership
- [ ] Endpoints reject insufficient permissions with 403
- [ ] Endpoints reject unauthorized attempts with 401

#### 10.3 Input Validation
- [ ] Missing required fields → 400 Bad Request
- [ ] Invalid UUID format → 400 Bad Request
- [ ] Invalid enum values → 400 Bad Request
- [ ] Oversized input (e.g., description > 5000 chars) → 400 Bad Request
- [ ] Unexpected fields accepted or ignored (not an error)
- [ ] SQL injection attempts safe (parameterized queries)
- [ ] XSS payloads safe (sanitized)

#### 10.4 Error Handling
- [ ] Production errors don't expose stack traces
- [ ] Production errors don't expose database queries
- [ ] Production errors don't expose file paths
- [ ] Production errors don't expose environment variables
- [ ] Error messages safe for client display
- [ ] Technical errors logged server-side
- [ ] 404 for non-existent resources (not info leak)
- [ ] 403 for unauthorized (not 404)

#### 10.5 HTTP Methods
- [ ] GET requests are idempotent
- [ ] POST requests create new resources
- [ ] PATCH requests update existing resources
- [ ] DELETE requests remove resources
- [ ] Invalid HTTP methods → 405 Method Not Allowed
- [ ] OPTIONS preflight handled correctly (CORS)

**Success Criteria**: All endpoints properly authenticated/authorized. Input validated. Errors safe. HTTP compliance.

---

### 11. RLS (Row Level Security) Testing

#### 11.1 Table Coverage
- [ ] profiles table: RLS enabled
- [ ] organizations table: RLS enabled
- [ ] elections table: RLS enabled
- [ ] candidates table: RLS enabled
- [ ] voters table: RLS enabled
- [ ] election_voters table: RLS enabled
- [ ] ballots table: RLS enabled
- [ ] ballot_selections table: RLS enabled
- [ ] results table: RLS enabled
- [ ] audit_logs table: RLS enabled
- [ ] notifications table: RLS enabled
- [ ] organization_memberships table: RLS enabled
- [ ] election_templates table: RLS enabled

#### 11.2 Policy Verification
- [ ] SELECT policies restrict to authorized users
- [ ] INSERT policies restrict to authorized users
- [ ] UPDATE policies restrict to authorized users
- [ ] DELETE policies restrict to authorized users
- [ ] No policy allows "USING (true)" (open access)
- [ ] No policy allows "USING (false)" (blocking policy)
- [ ] Organization_id column used in all policies
- [ ] Super admin policies exist and work

#### 11.3 Direct Database Tests
- [ ] Test with Org A user token → Org A data only
- [ ] Test with Org B user token → Org B data only
- [ ] Test with Super Admin token → all data
- [ ] Test with invalid token → no data
- [ ] Test with expired token → no data

**Success Criteria**: RLS enforced at database layer. No bypass possible at application layer.

---

### 12. Privilege Escalation Testing

#### 12.1 Role Manipulation
- [ ] Ordinary voter cannot set own role to SUPER_ADMIN
- [ ] Ordinary voter cannot set own role to ORGANIZATION_ADMIN
- [ ] Election officer cannot promote to ORGANIZATION_ADMIN
- [ ] Organization admin cannot promote to SUPER_ADMIN
- [ ] Org A admin cannot change Org B user roles
- [ ] Role changes only through authorized endpoints
- [ ] Role change attempts logged

#### 12.2 Organization Membership Manipulation
- [ ] User cannot add themselves to unauthorized organization
- [ ] User cannot remove themselves from organization (if not allowed)
- [ ] User cannot change another user's organization
- [ ] Org A admin cannot add user to Org B
- [ ] Organization_id in request body ignored (server-side source)

#### 12.3 Admin Function Access
- [ ] Non-Super Admin cannot access /admin routes
- [ ] Non-Super Admin cannot access /api/admin/* routes
- [ ] /admin/users requires SUPER_ADMIN
- [ ] /admin/audit-logs requires SUPER_ADMIN
- [ ] /admin/settings requires SUPER_ADMIN
- [ ] /admin/system-health requires SUPER_ADMIN

**Success Criteria**: Role-based restrictions enforced. No privilege escalation possible.

---

### 13. Data Integrity Testing

#### 13.1 Database Constraints
- [ ] Unique constraints prevent duplicates
- [ ] Foreign key constraints enforce relationships
- [ ] Check constraints enforce valid values
- [ ] NOT NULL constraints on critical fields
- [ ] Cascade deletes work correctly (e.g., election → candidates)

#### 13.2 Business Logic Constraints
- [ ] Cannot vote twice in same election (election_voters unique constraint)
- [ ] Cannot duplicate memberships (organization_memberships unique)
- [ ] Cannot duplicate invitations for same email
- [ ] Ballot created only once per voter per election
- [ ] Results calculated only once per election

#### 13.3 Consistency Checks
- [ ] Vote count matches ballot count
- [ ] Candidate votes sum to total ballots submitted
- [ ] Organization election count matches database
- [ ] Voter list count matches database

**Success Criteria**: Database constraints enforced. Business logic validated. Data consistency maintained.

---

### 14. Performance Testing

#### 14.1 Query Efficiency
- [ ] No N+1 queries in common operations
- [ ] Election list loads with <100ms (light pagination)
- [ ] Voter list loads with <500ms (100 voters)
- [ ] Results calculation completes in <5 seconds
- [ ] Audit log queries are paginated

#### 14.2 Load Limits
- [ ] Importing 10 voters succeeds
- [ ] Importing 100 voters succeeds
- [ ] Importing 1,000 voters succeeds (if database size allows)
- [ ] 10 concurrent votes submitted → all succeed
- [ ] 100 concurrent votes submitted → all succeed (if database allows)

#### 14.3 Pagination
- [ ] Elections paginated (not all returned)
- [ ] Voters paginated (not all returned)
- [ ] Audit logs paginated (not all returned)
- [ ] Notifications paginated (not all returned)
- [ ] Candidates paginated if many

**Success Criteria**: Queries efficient. No N+1 issues. Pagination implemented where needed. Scales to production size.

---

### 15. End-to-End Workflow Test

**Scenario**: Complete election from creation to results publication

1. [ ] Super Admin logs in
2. [ ] Super Admin creates Organization A
3. [ ] Super Admin creates Organization A Admin user
4. [ ] Organization A Admin logs in
5. [ ] Org A Admin creates Election
6. [ ] Org A Admin sets election status to SCHEDULED
7. [ ] Org A Admin creates Positions (President, VP)
8. [ ] Org A Admin approves Candidates
9. [ ] Org A Admin imports 5 test Voters
10. [ ] Org A Admin sets election status to OPEN
11. [ ] Voter A logs in
12. [ ] Voter A views election
13. [ ] Voter A votes (selects candidate for each position)
14. [ ] Voter A submits ballot
15. [ ] Voter B votes
16. [ ] Org A Admin closes election (OPEN → CLOSED)
17. [ ] Results calculated (CLOSED → RESULTS_READY)
18. [ ] Org A Admin publishes results (RESULTS_READY → PUBLISHED)
19. [ ] Voter A views published results
20. [ ] Org A Admin views audit log
21. [ ] Audit log shows all actions
22. [ ] Voter A's vote not visible individually (privacy)

**Success Criteria**: Entire workflow completes successfully without manual database manipulation.

---

### 16. Security Headers & HTTPS

- [ ] Content-Security-Policy header present
- [ ] X-Frame-Options header present (DENY)
- [ ] X-Content-Type-Options header present (nosniff)
- [ ] Referrer-Policy header present
- [ ] Permissions-Policy header present
- [ ] HTTPS enforced (no mixed content)
- [ ] Cookies have Secure flag
- [ ] Cookies have HttpOnly flag (if sensitive)
- [ ] Cookies have SameSite attribute

**Success Criteria**: All security headers correctly configured.

---

### 17. Dependency Security Audit

- [ ] Run `npm audit`
- [ ] Review high/critical vulnerabilities
- [ ] Update vulnerable dependencies if safe
- [ ] Document vulnerabilities that cannot be fixed
- [ ] No known vulnerabilities in critical dependencies

**Success Criteria**: No high/critical vulnerabilities in production code.

---

### 18. Secret Scanning

- [ ] No hardcoded API keys in source code
- [ ] No hardcoded database credentials
- [ ] No hardcoded Supabase service role keys
- [ ] .env.local excluded from version control
- [ ] .env.example exists with placeholder values
- [ ] No secrets in environment-specific files
- [ ] Git history clean of secrets (manual review if needed)

**Success Criteria**: No production secrets in repository.

---

## Test Execution & Results

### Phase 13 Status
- [ ] All test categories executed
- [ ] Security issues identified and documented
- [ ] Bugs found and prioritized
- [ ] High-severity bugs fixed
- [ ] Regression tests pass
- [ ] Final report generated
- [ ] Production blockers identified

## Bugs & Fixes Log

| ID | Severity | Category | Description | Status | Fix |
|----|----------|----------|-------------|--------|-----|
| | | | | | |

## Security Test Matrix

| Test | Expected Result | Actual Result | Status | Notes |
|------|-----------------|---------------|--------|-------|
| | | | | |

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cross-tenant data leak | Medium | Critical | RLS policies, per-test verification |
| Privilege escalation | Low | Critical | Authorization tests, role validation |
| Duplicate voting | Low | High | Database constraints, API idempotency |
| Vote privacy leak | Low | Critical | Audit log review, API response inspection |
| Unauthorized admin access | Low | High | Middleware tests, 401/403 verification |

---

## Success Criteria Summary

✅ **MUST HAVE** (Blockers):
- All 61 existing tests pass
- Zero cross-tenant data access possible
- Zero privilege escalation paths
- Zero duplicate voting
- All vote privacy maintained
- npm run build succeeds
- npm run lint succeeds
- No production secrets in repository

✅ **SHOULD HAVE** (High Priority):
- All authorization tests pass
- All API security tests pass
- All multi-tenant tests pass
- Security headers correctly configured
- No high/critical dependency vulnerabilities

✅ **NICE TO HAVE** (Medium Priority):
- Performance optimization identified
- Load testing completed
- Cross-browser testing completed
- Accessibility testing completed

---

## Test Timeline

- **Day 1**: Inspection, plan creation, setup
- **Day 2-4**: Execute all test categories
- **Day 5**: Fix identified issues
- **Day 6**: Regression testing
- **Day 7**: Final report generation

---

**Next Step**: Begin systematic testing according to this plan.
