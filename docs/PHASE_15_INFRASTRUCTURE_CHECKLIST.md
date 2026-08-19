# Phase 15 Production Infrastructure Checklist

**Date:** 2026-08-19  
**Status:** Preparation complete; deployment blocked pending manual infrastructure setup  
**Deployment:** Not performed

## Platform and Domain

- [ ] Deployment platform selected: Vercel is the existing repository signal
- [ ] Production Vercel project created and approved
- [ ] Production domain configured
- [ ] HTTPS certificate and HTTP-to-HTTPS behavior verified
- [ ] `NEXT_PUBLIC_APP_URL` set to the approved HTTPS origin
- [ ] Public election, voting, invitation, candidate, and notification links verified against the domain

## Environment Variables

- [ ] Complete inventory reviewed in `docs/PRODUCTION_ENVIRONMENT_VARIABLES.md`
- [ ] Public Supabase URL and anon key configured
- [ ] Server-only Supabase URL/anon key configured for current health behavior
- [ ] Service-role key stored only in the platform secret manager
- [ ] `DATABASE_URL` configured only in the server environment
- [ ] `NODE_ENV=production` configured
- [ ] `APP_VERSION` assigned for release observability
- [ ] No secret appears in source, client code, logs, or committed environment files

## Upstash Rate Limiting

- [ ] Upstash Redis database created in the approved region
- [ ] `RATE_LIMIT_BACKEND=upstash` configured in staging
- [ ] `UPSTASH_REDIS_REST_URL` configured server-side
- [ ] `UPSTASH_REDIS_REST_TOKEN` configured server-side
- [ ] Production does not use `memory` backend
- [ ] Multi-instance counter consistency tested
- [ ] Backend outage produces safe `503` behavior
- [ ] `429`, `Retry-After`, reset, IP, user, and user/election identifiers verified

## Supabase and Database

- [ ] Production Supabase project selected
- [ ] Project URL and anon key verified
- [ ] Service-role key restricted to server-only operations
- [ ] Database backup availability verified before migration
- [ ] Migration status checked against staging/production safely
- [ ] No production migration applied during preparation
- [ ] RLS enabled and cross-organization isolation tested
- [ ] Storage policies verified separately

## Authentication

- [ ] Supabase Auth site URL set to the production HTTPS domain
- [ ] Auth callback URL configured for `/auth/Callback`
- [ ] Redirect URLs reviewed for login, logout, dashboard, and invitation acceptance
- [ ] Password reset URL verified with a non-production test account
- [ ] Email verification URL verified with a non-production test account
- [ ] Session expiry and logout verified
- [ ] `NEXTAUTH_URL`/`NEXTAUTH_SECRET` contract reconciled with the Supabase Auth architecture

## Email

- [ ] Production provider selected: SendGrid or Resend are implemented; SMTP is only a placeholder
- [ ] `EMAIL_PROVIDER` configured to a real provider
- [ ] Provider credential stored server-side
- [ ] `EMAIL_FROM` sender domain verified
- [ ] Reply-to configuration approved
- [ ] Invitation templates tested only with designated test accounts
- [ ] Election notification templates tested only with designated test accounts
- [ ] Password-reset email path verified
- [ ] No real-user email sent during preparation

## Storage

- [ ] Storage implementation identified or explicitly approved as not yet implemented
- [ ] Production bucket names selected
- [ ] Public/private visibility decided
- [ ] Upload routes identified
- [ ] Storage policies verified for organization isolation
- [ ] Organization logos and election branding tested with two non-production organizations
- [ ] No private storage credentials exposed to clients

## Security and Health

- [ ] CSP verified against authentication, dashboard, ballot, and public election flows
- [ ] HSTS verified
- [ ] X-Content-Type-Options verified
- [ ] Referrer-Policy verified
- [ ] Permissions-Policy verified
- [ ] `/api/health` verified as non-sensitive
- [ ] Health response does not expose secrets, tokens, environment values, credentials, or stack traces
- [ ] Authenticated system-health endpoint tested separately for real dependency connectivity

## Operations

- [ ] Monitoring provider selected and configured
- [ ] Alerts configured for health failures, 5xx responses, latency, auth failures, and rate-limit spikes
- [ ] Logs reviewed for passwords, tokens, API keys, service-role credentials, ballot selections, and unnecessary voter data
- [ ] Production backup retention verified
- [ ] Non-destructive restore verification completed in an isolated environment
- [ ] Rollback procedure approved in `docs/PRODUCTION_ROLLBACK.md`
- [ ] Final production checklist approved in `docs/FINAL_PRODUCTION_CHECKLIST.md`

## Current Blockers

- [ ] Production platform project and domain are not configured
- [ ] Upstash account and credentials are not configured
- [ ] Production Supabase/Auth/database/storage configuration is not verified
- [ ] Email provider is not configured
- [ ] Monitoring and backup verification are not complete
- [ ] Three high-severity Prisma/deepmerge dependency findings remain unresolved
- [ ] Release boundary remains uncommitted and requires human approval

## Exact Manual Sequence Before Deployment

1. Approve the release boundary and dependency status.
2. Configure a staging Vercel project and staging HTTPS domain.
3. Configure staging Supabase, Auth redirects, Upstash, email, and storage using secret-manager values.
4. Run migrations only against staging after backup/restore evidence is available.
5. Execute RLS, auth, email, storage, rate-limit, health, monitoring, and smoke tests.
6. Resolve all critical findings and obtain deployment approval.