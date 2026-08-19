# VoteHub Security and Audit Model

## Ballot privacy guarantees

VoteHub does not store individual selections in an exposed, queryable audit trail. The ballot architecture separates:

- voter eligibility and participation from the final ballot submission
- ballot metadata from candidate choice records
- audit records from selection data

The security model requires that any vote choice data remain server-side and only aggregated result snapshots are exposed after an election is published.

## Audit logging

Audit events are written through the centralized service in `src/lib/audit/audit.service.ts`.

- All metadata is sanitized before persistence.
- Sensitive keys such as password, token, ballot contents, and session data are redacted.
- Event records are scoped by organization when available.
- The `audit_logs` table is intended for administrative review only and does not include individual ballot selections.

## Access model

Only the following actors may view organization-scoped audit records:

- `SUPER_ADMIN`
- `ORG_ADMIN`
- `ELECTION_OFFICER`

Cross-tenant access is rejected throughout the security checks.

## Runtime hardening

The app applies baseline web hardening headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` with a strict default policy

## Operational notes

- Failures to authenticate are recorded as security events without storing user secrets.
- Route protections remain enforced in middleware and server-side authorization checks.
- Result publication remains aggregate-only and never exposes raw ballot choices.
