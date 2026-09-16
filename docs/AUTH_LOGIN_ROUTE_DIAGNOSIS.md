# VoteHub Authentication Login Route Diagnosis

**Date:** 2026-08-20
**Scope:** Determine the existing login route and explain `/login` behavior
**Deployment changes:** None

## Findings

1. VoteHub already has a login page.
2. The canonical login route is `/auth/login`.
3. The page implementation is `auth/login/page.tsx`.
4. The login form implementation is `components/auth/LoginForm.tsx`.
5. Authentication is handled through Supabase Auth.
6. Middleware redirects unauthenticated protected-route requests to `/auth/login`.
7. `/login` is intended to be a compatibility route, not the canonical page route.

## Actual Login Route

```text
/auth/login
```

Source file:

```text
auth/login/page.tsx
```

That page renders `LoginForm` from `components/auth/LoginForm.tsx`.

The form calls:

```ts
supabase.auth.signInWithPassword({ email, password })
```

After a successful login, it navigates to `/dashboard`.

## Authentication Provider

The application uses Supabase Auth through the browser Supabase client:

```text
src/lib/supabase/Client.ts
src/lib/supabase.ts
```

The client is configured with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The server-side Supabase client is used by protected server routes and middleware:

```text
src/lib/supabase/Server.ts
middleware.ts
```

## Redirect Behavior

The deployed `middleware.ts` protects these route families:

- `/dashboard`
- `/admin`
- `/settings`
- `/organizations`
- `/elections`

When there is no valid Supabase user session, middleware redirects to:

```text
/auth/login?redirectTo=<original-path>
```

The callback route is:

```text
auth/Callback/route.ts
```

It exchanges the Supabase auth code for a session and redirects to `/dashboard`.

The root-level compatibility route is:

```text
Login/page.tsx
```

It redirects `/Login` to `/auth/login`. On case-sensitive production filesystems, this does not create a lowercase `/login` route by itself.

## Is `/login` Supposed To Exist?

`next.config.js` contains these rewrites:

```js
{ source: "/login", destination: "/auth/login" },
{ source: "/Login", destination: "/auth/login" },
```

Therefore, the project intends both `/login` and `/Login` to reach `/auth/login` through rewrites. However, the actual page route is `/auth/login`, and all application redirects found in the deployed source target `/auth/login` directly.

If `/auth/login` works but `/login` returns 404 in Vercel, the likely issue is deployment configuration or rewrite handling rather than a missing login UI. The canonical URL to use is `/auth/login`.

## Broken Links

The deployed source contains many redirects to `/auth/login`, including admin pages and middleware. No application source link was found that depends on a lowercase `/login` page implementation.

The rate-limit documentation mentions a hypothetical `/api/auth/login` endpoint, but the actual login form signs in directly with Supabase Auth and no `/api/auth/login` route is implemented. That documentation reference is not the browser login page.

## Recommended Fix

Do not create another login page and do not change authentication behavior. Use:

```text
/auth/login
```

For the `/login` alias, verify that the deployed Vercel build includes the current `next.config.js` rewrite configuration and that the project root is the repository root. The current root must contain `package.json`, `next.config.js`, and the `app/` directory.

If the canonical `/auth/login` route works but the alias remains 404, the compatibility rewrite is the narrow fix to investigate. The existing login UI and Supabase authentication flow should remain unchanged.

## Validation

Requested commands were run without deployment or commit:

- `npm run lint`: Passed with existing warnings.
- `npm run typecheck`: Passed.
- `npm run build`: Compilation and TypeScript passed; local route collection requires Supabase environment values that are not available in the local shell.
- `npm test`: Passed.

The local development server also exposed an unrelated duplicate dynamic route conflict between `app/api/elections/[id]` and the candidate route tree. No authentication behavior was changed to address that conflict.
