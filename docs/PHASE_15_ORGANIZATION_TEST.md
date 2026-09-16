# Phase 15 Organization Test

**Date:** 2026-08-22
**Scope:** Existing organization creation and membership flow
**Deployment changes:** None

## Summary

The current runtime organization-creation flow is the registration API:

```text
POST /api/auth/register
```

It creates a Supabase Auth user, creates an `organizations` row, and creates the first administrator's `profiles` row linked by `organization_id`. The first administrator is the user submitted in the same registration request.

The dashboard does not provide organization creation. The admin organizations page displays a `Create Organization` button, but the current button has no click handler or creation request. The authenticated onboarding endpoint exists in source but is not the recommended staging path because it creates only an organization row and does not assign the caller's profile to it.

## 1. How an Organization Is Created

The active API path is `app/api/auth/register/route.ts`:

1. The request body is validated with `registerSchema`.
2. `registerOrganization()` in `src/services/auth.service.ts` generates a unique slug by checking the `organizations` table.
3. `adminClient.auth.admin.createUser()` creates the Supabase Auth user and confirms the email.
4. The service inserts an organization into `organizations` with the submitted organization details and `status: "PENDING"`.
5. The service inserts the first administrator into `profiles` with:
   - `id` equal to the Supabase Auth user ID;
   - `organization_id` equal to the new organization ID;
   - `role: "ORGANIZATION_ADMIN"`;
   - the submitted email/name and organization location fields.

The service returns the created user and organization to the API handler. The API responds with HTTP 201 on success.

## 2. Which User Creates It

For the registration flow, the unauthenticated person submitting the registration request creates the organization and becomes its first `ORGANIZATION_ADMIN`. The server creates the Auth account using the server-side service-role client, but the submitted user is the account owner represented in the resulting profile.

There is also `Onboarding/route.ts`, which requires an already authenticated Supabase user and calls `onboardOrganization()`. That path is not the complete owner-assignment flow: it inserts an organization through `Organizations/Organization.service.ts`, then only calls `getProfile(userId)` without updating or inserting the profile's `organization_id`.

## 3. How the Organization Owner/Admin Is Assigned

The registration service assigns the first administrator directly in the `profiles` insert:

```text
profiles.id              = authData.user.id
profiles.organization_id = organization.id
profiles.role            = ORGANIZATION_ADMIN
```

There is no separate owner column and no `organization_users` membership insert in this runtime flow. Subsequent role changes are administered through the profile's `role` and `organization_id` fields by the existing admin role APIs. Role validation is server-side and reads the authenticated user's profile.

## 4. Database Tables Involved in Creation

The exact tables written or read by the active registration flow are:

- Supabase Auth's managed users store, through `adminClient.auth.admin.createUser()`;
- `organizations`, for the organization record and unique slug check;
- `profiles`, for the first administrator's application identity, role, and membership link.

The registration endpoint also uses the rate-limit service, but that is not an organization membership table.

The repository contains a legacy/inconsistent `prisma/schema.prisma` with `Organization`, `User`, `Poll`, and `Profile` models. The runtime organization code uses Supabase tables and columns such as `organizations.id` (UUID), `profiles.organization_id`, `status`, and `slug`; the Prisma file is not the source of truth for this staging flow and must not be used to create test data.

## 5. How Organization Membership Is Represented

Runtime membership is represented by the nullable foreign-key-style field:

```text
profiles.organization_id -> organizations.id
```

The user's Supabase Auth ID is the `profiles.id`. The profile's `role` determines organization-level permissions, with `ORGANIZATION_ADMIN` being the organization administrator role. `SUPER_ADMIN` is platform-level and may operate across organizations.

The source contains references to an `organization_users` table in RLS tests and documentation, but the application runtime queries inspected here do not use `.from("organization_users")`. No separate membership-table write is performed by the active registration flow.

## 6. Cross-Organization Authorization

Authorization is enforced in multiple layers:

- `requireSuperAdmin()` obtains the authenticated Supabase session and verifies `profiles.role === "SUPER_ADMIN"` from the database; it does not trust client-provided roles.
- `getCurrentOrganization()` obtains the authenticated user's profile, requires a non-null `organization_id`, loads only that organization, and rejects suspended or archived organizations.
- `requireOrganizationMembership()` applies role checks after loading the authenticated user's organization context.
- `assertOrganizationAccess()` rejects requests where the current and requested organization IDs differ.
- Organization-scoped repositories and services filter records by the authenticated profile's `organization_id` and compare related records' organization IDs.
- Admin APIs use `requireSuperAdmin()` and return 401/403 for unauthorized or non-super-admin users.
- The repository's documented/tested design also expects Supabase RLS policies to prevent cross-organization reads and writes at the database layer. This diagnosis does not change or verify remote policy contents.

## 7. Whether the Dashboard Provides Organization Creation

No. The regular dashboard includes organization settings and current-organization views, but its quick actions create elections, import voters, or open organization settings. It does not create organizations.

The platform admin page `app/admin/organizations/page.tsx` shows a `Create Organization` button, but the current implementation has no handler and the corresponding `GET /api/admin/organizations` endpoint only lists organizations. There is no active admin `POST` organization-creation endpoint in the inspected App Router.

## 8. Whether to Use an Existing UI or API

Use the existing registration API for the staging organization test:

```text
POST /api/auth/register
```

The intended registration form is `src/components/auth/RegisterForm.tsx` and submits to that endpoint, but its page files are outside the active `app/` route tree: `auth/register/page.tsx` and `register/page.tsx` do not produce an `/auth/register` route in the current build. Therefore, the reliable current staging path is to call the existing API directly with a valid registration payload, or use an already available deployment/UI route only if the deployment separately exposes that form.

Do not use `Onboarding/route.ts` for this test unless its incomplete membership behavior is deliberately being tested. Do not use the admin page's `Create Organization` button; it is not wired to an API.

## Recommended Staging Test Flow

1. Use a unique organization name and a dedicated staging administrator email.
2. Submit the existing registration payload to `POST /api/auth/register`.
3. Confirm the response is HTTP 201 and does not expose secrets.
4. Sign in with the newly created administrator through the existing Supabase login flow.
5. Open `/dashboard` and confirm the authenticated profile resolves to the created organization.
6. Use the dashboard's existing election workflow to create the first election.
7. For isolation testing, create a separate organization through a separate registration account and verify that each administrator cannot access the other organization's records.

## Organization-Related Tables Used by the Application

Core organization and membership tables:

- `organizations` - organization identity, slug, status, contact and location data;
- `profiles` - Auth-linked users, role, and `organization_id` membership link.

Organization-scoped operational tables currently queried by application code include:

- `elections` - election ownership via `organization_id`;
- `positions` - election/organization-scoped election positions;
- `candidates` - position/election organization-scoped candidates;
- `election_voters` - election and organization-scoped voter eligibility;
- `audit_logs` - actor and organization-related audit records;
- `notifications` - user and organization-related notifications.

Related organization administration/audit tables are described in repository documentation and tests, including `organization_suspension_audit` and `user_role_audit`, but the inspected runtime organization creation path does not write them. `organization_users` is likewise referenced by RLS tests/documentation, not by the runtime membership queries found in this repository.

## Conclusion

For the Phase 15 staging test, create the organization through the existing `POST /api/auth/register` flow. It is the only inspected path that atomically creates the Auth user, organization, and linked organization administrator profile. No schema, database, authentication, or deployment changes are required for this diagnosis.