# Supabase Auth 404 Root Cause

**Date:** 2026-08-21
**Scope:** Supabase Auth password-login request
**Deployment changes:** None

## 1. Exact Source of `/rest/v1`

The malformed request is:

```text
https://<project>.supabase.co/rest/v1/auth/v1/token?grant_type=password
```

The VoteHub application does not append `/rest/v1` to the Supabase URL. The browser client, server client, middleware client, callback client, rate-limit client, and admin client all receive `process.env.NEXT_PUBLIC_SUPABASE_URL` directly.

The Supabase client library derives service paths from the supplied base URL. It adds `auth/v1` for Auth and `rest/v1` for PostgREST. Therefore, seeing `/rest/v1/auth/v1/token` means the runtime base URL already contains `/rest/v1` (likely with a trailing slash) before the library adds `auth/v1`.

The exact source is consequently the deployed runtime value of `NEXT_PUBLIC_SUPABASE_URL`, not a VoteHub string literal or a Next.js route rewrite. The repository cannot inspect Vercel environment-variable values, so the Vercel value itself must be verified in the Vercel Preview environment.

## 2. File Responsible

The browser login client is defined in `src/lib/supabase/Client.ts`:

```ts
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

`components/auth/LoginForm.tsx` calls `supabase.auth.signInWithPassword(...)`; it does not construct a URL.

The same environment value is passed directly in these additional client setups:

- `src/lib/supabase.ts`
- `src/lib/supabase/Server.ts`
- `src/lib/supabase/admin.ts`
- `middleware.ts`
- `auth/Callback/route.ts`
- `src/lib/security/rate-limit.service.ts`

None of these files appends `/rest/v1`.

## 3. Current Configuration

Application configuration currently expects the public URL variable to be the Supabase project URL:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

That expectation is documented in `.env.example`. The inspected application code passes the variable unchanged into `createBrowserClient`, `createServerClient`, or `createClient`.

Repository-wide searches found:

- No source occurrence that constructs `/rest/v1/auth/v1`.
- No custom `fetch`, `baseUrl`, or `baseURL` option in VoteHub Supabase client configuration.
- No Next.js rewrite targeting Supabase; `next.config.js` only rewrites `/login` and `/Login` to `/auth/login`.
- `auth/v1` and `/rest/v1` examples in generated `.next` output and dependency documentation are normal Supabase library behavior, not application configuration.

The lockfile resolves `@supabase/supabase-js` to `2.112.3` and `@supabase/ssr` to `0.12.4`. This is not evidence of incorrect package configuration; the packages are being called with their normal URL/key arguments.

## 4. Expected Configuration

Vercel Preview must provide:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
```

It must not contain `/rest/v1`, `/auth/v1`, `/storage/v1`, or another API path. The anon key must belong to the same Supabase project. The value is public configuration; no key value should be added to this document or logs.

## 5. Minimal Fix

Update the Vercel **Preview** value of `NEXT_PUBLIC_SUPABASE_URL` to the bare project URL, remove the `/rest/v1` suffix, and create a new Preview deployment so the public environment variable is rebuilt into the browser bundle.

Do not change the authentication provider, add an authentication endpoint, modify the database, or add URL manipulation in application code.

## 6. Do Vercel Environment Variables Need Correction?

Yes. Based on the exact failing request, the Vercel Preview value of `NEXT_PUBLIC_SUPABASE_URL` is incorrectly configured with `/rest/v1` (or an equivalent REST API base value). Verify the variable by name and shape in Vercel without exposing its value. This repository cannot independently confirm the remote value.

## 7. Are Code Changes Required?

No application code changes are required. The existing client configuration already passes the environment variable in the expected form. The only change made for this investigation is this diagnosis document.

## Validation

The requested commands were run after the diagnosis was documented:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`

No deployment or commit was performed.