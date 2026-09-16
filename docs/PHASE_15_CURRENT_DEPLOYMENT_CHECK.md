# Phase 15 Current Staging Deployment Check

**Date:** 2026-08-25

## Current Git State

- Current commit: `81fe5c00e2315643b34559b209e17420d364f93b`
- Current branch: `deploy-dependency-fix`
- Commit message: `phase 15: add safe registration diagnostics`
- Remote tracking ref: `origin/deploy-dependency-fix` at `81fe5c0`

The worktree contains unrelated pre-existing changes, but no changes were made during this check.

## Diagnostic Code

The checked-out source contains the temporary diagnostic code in both requested files:

- `app/api/auth/register/route.ts` generates and passes a `correlationId`.
- `src/services/auth.service.ts` logs:
  - `organization slug lookup`
  - `Supabase Auth user creation`
  - `organization INSERT`
  - `profile INSERT`

## Vercel Deployment Identity

No Vercel project metadata or CLI is available locally:

- Vercel CLI: unavailable
- `.vercel/project.json`: absent
- `vercel.json`: absent
- Vercel project name: unavailable
- Connected Vercel branch: unavailable
- Preview/staging branch: unavailable
- Production branch: unavailable
- Deployment status: unavailable
- Deployment commit: unavailable

The Git repository is `https://github.com/Essel12345/votehub.git`, and the current Git branch is `deploy-dependency-fix`. This does not prove the Vercel project is connected to that branch.

## Current Staging URL

The repository does not identify a single new current staging URL. Two candidate hosts respond successfully:

1. `https://votehub-staging.vercel.app`
2. `https://votehub-staging-17r3od9ce-essel12345s-projects.vercel.app`

Neither public response exposes the serving Git commit. The exact deployment URL associated with commit `81fe5c0` is therefore unavailable.

```text
CURRENT TEST URL:
Not determinable from workspace evidence

DEPLOYMENT URL FOR 81fe5c0:
Not determinable from workspace evidence

MATCH:
UNKNOWN
```

## Health Results

Both candidate hosts returned HTTP 200 and the expected healthy configuration checks:

```text
https://votehub-staging.vercel.app
HTTP status: 200
status: healthy
database: configured
auth: configured
environment: configured

https://votehub-staging-17r3od9ce-essel12345s-projects.vercel.app
HTTP status: 200
status: healthy
database: configured
auth: configured
environment: configured
```

Health confirms the hosts are live and configured. It does not identify the deployment commit or confirm that the diagnostic code is serving remotely.

## Readiness for Registration

The current deployment is **not ready for the next registration test** because the staging hostname-to-commit association and Vercel Ready status are unverified. The Vercel dashboard must confirm that the selected staging hostname points to a Ready Preview deployment whose Source commit is `81fe5c0`.

No registration request was sent. No code, Supabase, RLS, deployment, or commit changes were made.
