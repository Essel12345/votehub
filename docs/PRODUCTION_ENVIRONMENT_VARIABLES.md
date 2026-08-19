# VoteHub Production Environment Variables

**Date:** 2026-08-19  
**Scope:** Inventory of variables referenced by application source  
**Deployment:** Not performed

Values are intentionally omitted. Configure production values through the approved platform secret manager, never in source control.

## Public Supabase Variables

| Variable | Purpose | Visibility | Required in production | Where used |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by browser and server clients | Public | Yes | `src/lib/supabase.ts`, `src/lib/supabase/Client.ts`, `src/lib/supabase/Server.ts`, `src/middleware.ts`, `src/app/auth/Callback/route.ts`, `src/lib/security/rate-limit.service.ts`, `src/lib/supabase/admin.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public client key; access remains controlled by RLS | Public | Yes | `src/lib/supabase.ts`, `src/lib/supabase/Client.ts`, `src/lib/supabase/Server.ts`, `src/middleware.ts`, `src/app/auth/Callback/route.ts`, `src/lib/security/rate-limit.service.ts` |
| `NEXT_PUBLIC_APP_URL` | Canonical application origin for generated email and election links | Public URL, server-consumed | Yes | `src/services/candidates/candidate.service.ts`, `src/services/elections/election.service.ts`, `src/services/invitations/invitation.service.ts`, `src/lib/notifications/scheduled-notifications.service.ts` |

`NEXT_PUBLIC_APP_URL` must be the HTTPS production origin with no trailing-path ambiguity. It is used for candidate links, dashboard links, invitation acceptance links, election links, voting links, and scheduled notification links.

## Server-Only Supabase and Database Variables

| Variable | Purpose | Visibility | Required in production | Where used |
|---|---|---|---|---|
| `SUPABASE_URL` | Server-side Supabase configuration check | Server-only | Yes for current `/api/health` behavior | `src/app/api/health/route.ts` |
| `SUPABASE_ANON_KEY` | Server-side Supabase configuration check | Server-only | Yes for current `/api/health` behavior | `src/app/api/health/route.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role client for privileged server operations | Server-only secret | Yes where `src/lib/supabase/admin.ts` is loaded | `src/lib/supabase/admin.ts` |
| `DATABASE_URL` | Prisma datasource/configuration URL and health configuration check | Server-only secret | Yes | `prisma/schema.prisma`, `prisma.config.ts`, `src/app/api/health/route.ts` |

Important: the application’s normal Supabase server/client code uses the `NEXT_PUBLIC_*` pair, while the public health route checks the server-only pair. Keep the existing behavior unchanged until a controlled code change reconciles this contract; provide the exact variables required by the current code in production.

## Authentication and Application Runtime

| Variable | Purpose | Visibility | Required in production | Where used |
|---|---|---|---|---|
| `NEXTAUTH_URL` | Authentication URL configuration check and documented callback base | Server-only | Yes for current health/auth configuration expectations | `src/app/api/health/route.ts` |
| `NEXTAUTH_SECRET` | Authentication secret configuration check and documented session configuration | Server-only secret | Yes for current health/auth configuration expectations | `src/app/api/health/route.ts` |
| `NODE_ENV` | Selects production behavior, including preventing rate-limit memory fallback | Server/runtime | Yes, `production` | `src/lib/security/rate-limit.service.ts` |
| `APP_VERSION` | Non-secret version displayed by health endpoints and system health | Server/runtime | Recommended | `src/app/api/health/route.ts`, `src/app/api/admin/system-health/route.ts` |

Supabase Auth is the active request authentication path in middleware and server routes. `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are still referenced by health/configuration logic and must be reconciled with the actual authentication architecture before production sign-off.

## Email Variables

| Variable | Purpose | Visibility | Required in production | Where used |
|---|---|---|---|---|
| `EMAIL_PROVIDER` | Selects `sendgrid`, `resend`, `smtp`, or logging fallback | Server-only | Yes; must be a real provider in production | `src/lib/email/email.service.ts`, `src/app/api/admin/system-health/route.ts` |
| `EMAIL_API_KEY` | SendGrid or Resend API credential | Server-only secret | Yes for SendGrid/Resend | `src/lib/email/email.service.ts`, `src/app/api/admin/system-health/route.ts` |
| `EMAIL_FROM` | Verified sender address | Server-only | Yes for a real provider | `src/lib/email/email.service.ts` |
| `SMTP_HOST` | SMTP server hostname | Server-only | Yes when `EMAIL_PROVIDER=smtp` | `src/lib/email/email.service.ts` |
| `SMTP_PORT` | SMTP server port | Server-only | Yes when `EMAIL_PROVIDER=smtp` | `src/lib/email/email.service.ts` |
| `SMTP_USER` | SMTP username | Server-only | Yes when `EMAIL_PROVIDER=smtp` | `src/lib/email/email.service.ts` |
| `SMTP_PASSWORD` | SMTP password | Server-only secret | Yes when `EMAIL_PROVIDER=smtp` | `src/lib/email/email.service.ts` |

The implemented templates cover invitation, election created/published/open/closing/closed, candidacy withdrawn, voter registration, and vote-recorded notifications. Password-reset email behavior is not implemented in the inspected email service and requires manual product/auth verification.

## Shared Rate-Limit Variables

| Variable | Purpose | Visibility | Required in production | Where used |
|---|---|---|---|---|
| `RATE_LIMIT_BACKEND` | Selects `upstash` in production or `memory` for local development | Server-only | Yes; must be `upstash` | `src/lib/security/rate-limit.service.ts` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint | Server-only secret/configuration | Yes when backend is `upstash` | `src/lib/security/rate-limit.service.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST authentication token | Server-only secret | Yes when backend is `upstash` | `src/lib/security/rate-limit.service.ts` |

Production must not use `RATE_LIMIT_BACKEND=memory`. Missing or invalid production backend configuration fails closed for rate-limited requests. No Upstash values exist in this repository.

## Security Header and Storage Configuration

No environment variables control security headers. They are configured in `next.config.js` and protected-route middleware: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, and X-XSS-Protection.

No storage bucket, upload route, bucket name, or storage-specific environment variable was found in application source. Supabase Storage therefore remains unconfigured/unverified for production and must not be assumed ready.

## Production Rules

- Never place `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `EMAIL_API_KEY`, `SMTP_PASSWORD`, or `UPSTASH_REDIS_REST_TOKEN` in a `NEXT_PUBLIC_*` variable.
- Never commit `.env`, `.env.local`, or real platform secret values.
- Configure `NEXT_PUBLIC_APP_URL`, Supabase Auth URLs, and email links to the same approved HTTPS domain.
- Resolve the health-check variable mismatch before production sign-off.