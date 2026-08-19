# VoteHub Production Rollback Procedure

## Scope

Use this procedure to restore application availability after a bad VoteHub deployment. Do not use it to erase production data or to blindly reverse a database migration.

## Identify a Bad Deployment

Rollback should be considered when one or more of these conditions is confirmed:

- `/api/health` returns `503` or the application fails to start.
- Authentication, ballot submission, or organization isolation fails smoke testing.
- Error rates, latency, or failed vote submissions exceed the deployment threshold.
- A security issue exposes unauthorized data or weakens access control.

Pause active election operations when voting integrity or privacy may be affected. Preserve logs, timestamps, deployment identifiers, and affected request IDs for incident review.

## Application Rollback

1. Confirm the failing deployment identifier and the last known-good deployment.
2. Stop traffic to the failing deployment or use the deployment platform's rollback to the last known-good build.
3. Keep the same production environment variables and database connection configuration.
4. Verify `/api/health`, login, protected-route authorization, and a non-production smoke workflow.
5. Restore traffic only after health and security checks pass.

The repository currently identifies Vercel as the intended platform in `README.md`, but no production project, domain, or deployment identifier is configured here. Platform-specific rollback commands must therefore be completed by the operator who owns the production project.

## Database Migrations

- Do not run `prisma migrate reset`, `db push`, or destructive SQL against production.
- Do not automatically roll back an applied migration if it changed production data.
- First stop or isolate the application if the schema and application are incompatible.
- Use a forward-compatible corrective migration after testing it against a backup or staging copy.
- Restore from a verified backup only through the approved database recovery process when data corruption is confirmed.
- Record the migration name, backup identifier, validation queries, and operator approval.

Migration commands and verification queries are documented in `docs/PRODUCTION_MIGRATIONS.md`.

## Disable Affected Functionality

If only one feature is affected, remove traffic to that route or use an approved feature-control mechanism. Do not disable RLS, authentication, duplicate-vote constraints, or rate limiting as a workaround.

## Restore Service

After rollback or remediation:

- Verify the health endpoint does not expose secrets or stack traces.
- Verify tenant isolation, ballot privacy, and duplicate-vote prevention.
- Verify audit logging and error monitoring.
- Monitor authentication, API errors, latency, and vote submissions closely.
- Document the incident and obtain approval before resuming a paused election.