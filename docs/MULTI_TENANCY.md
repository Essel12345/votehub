# Multi-tenancy model

## Organization model

VoteHub is a multi-tenant platform with one shared application and many isolated organizations. Each organization owns its own profile, elections, candidates, voters, audit logs, and notification state.

A tenant is represented by an organization record with:

- id
- name
- slug
- country
- timezone
- status
- created_at
- updated_at

The slug is the stable tenant identifier used for organization URLs and shared links. Organization creation uses a lowercase URL-safe slug derived from the organization name and rejects duplicates by checking for an existing row before inserting.

## Membership model

The current project uses the existing profile-based organization context and enforces authorization server-side before any organization-scoped operation runs. The founder of a new organization is created as an ORG_ADMIN (normalized to ORGANIZATION_ADMIN internally) and is bound to that organization profile.

A server-side organization context layer verifies:

- the authenticated session exists
- the user profile exists
- the profile has an organization_id
- the organization record exists
- the organization is not suspended or archived for normal operations
- the user's role satisfies the required permission set

## Organization context and switching

The secure organization context is implemented in `src/lib/organization/context.ts` and is used as the entry point for organization-scoped checks. Requests are expected to validate the server-side organization and never trust a client-provided `organization_id` value.

The current organization is selected by updating the authenticated profile's `organization_id` after verifying that the target organization exists. This is sufficient for the current schema while preserving the existing project design.

## RLS strategy

The project already separates critical tenant data using `organization_id` filters. Policy design should keep all access scoped to a single organization and deny direct access by default.

Core principles:

- default to deny
- require authentication
- compare the current actor's organization against the target record
- allow SUPER_ADMIN only for cross-tenant security operations
- never use blanket `USING (true)` policies on tenant-sensitive tables

## Roles

Supported roles include:

- SUPER_ADMIN
- ORGANIZATION_ADMIN (legacy alias: ORG_ADMIN)
- ELECTION_OFFICER
- CANDIDATE
- VOTER

The permission layer normalizes legacy `ORG_ADMIN` values to `ORGANIZATION_ADMIN` for compatibility.

## Suspension and archiving

Organization status is one of:

- PENDING
- ACTIVE
- SUSPENDED
- ARCHIVED

Suspended organizations cannot create elections, open elections, add voters, invite members, or change critical settings. Archived organizations are effectively read-only for ordinary users while preserving historical data.

## Data isolation

All organization APIs and server-side services must enforce tenant isolation by checking the current profile and organization before returning data. The application must reject cross-tenant requests when organization IDs do not match.

## Known limitations

This codebase uses the existing profile-centric model rather than a fully separate multi-membership table. The secure pattern is in place, but full cross-organization membership expansion would require adding a dedicated `organization_memberships` table and a richer relationship model.
