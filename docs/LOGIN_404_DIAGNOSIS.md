# VoteHub Staging `/login` 404 Diagnosis

**Date:** 2026-08-20
**Scope:** Route diagnosis only
**Deployment:** None
**Authentication changes:** None

## Login Route Source

The existing login UI is implemented by:

```text
auth/login/page.tsx
```

The form component is:

```text
components/auth/LoginForm.tsx
```

There is also a root-level redirect file:

```text
Login/page.tsx
```

It calls `redirect("/auth/login")`.

## Route Type

Neither file is in a valid Next.js App Router route directory.

Valid locations would be:

```text
app/login/page.tsx
app/auth/login/page.tsx
src/app/login/page.tsx
src/app/auth/login/page.tsx
```

The current files are under root-level `Login/` and `auth/`, beside `app/`, so Next.js treats them as ordinary source directories rather than routes. There is no `app/login/page.tsx`, `pages/login.tsx`, `app/auth/login/page.tsx`, or `src/app/auth/login/page.tsx`.

## Git Tracking and Branch State

The current branch tracks both:

```text
Login/page.tsx
auth/login/page.tsx
```

They are not excluded by `.gitignore`; no `.gitignore` file exists in the current checkout. Being tracked does not make them routable because their directories are outside `app/` and `src/app/`.

The current working tree also contains unrelated uncommitted route-tree changes and generated files. No changes were made for this diagnosis.

## Build Evidence

The production build was run with non-secret placeholder environment values solely to allow route generation. Its route table included `/`, admin routes, API routes, and other pages, but did not include either:

```text
/login
/auth/login
```

This proves the production build does not include a login route.

A normal local `npm run build` also compiles and typechecks but stops during route data collection when local Supabase environment values are absent. No real values were printed or added.

## Local HTTP Results

Using the locally built production server:

| URL | Result |
|---|---:|
| `http://localhost:3000/login` | 404 |
| `http://localhost:3000/auth/login` | 404 |

Using the development server:

| URL | Result |
|---|---:|
| `http://localhost:3000/login` | 404 |
| `http://localhost:3000/auth/login` | 404 |

The development server also reports the requests as 404, confirming this is a route placement issue rather than only a Vercel deployment issue.

## Middleware Findings

`middleware.ts` protects `/dashboard`, `/admin`, `/settings`, `/organizations`, and `/elections`. For unauthenticated requests to those protected paths it redirects to:

```text
/auth/login?redirectTo=<original-path>
```

The middleware does not protect `/login` or `/auth/login`, and it does not create either route. Because `/auth/login` is currently not a registered route, protected-route redirects lead to another 404.

## Next.js Configuration Findings

`next.config.js` contains rewrites:

```js
{ source: "/login", destination: "/auth/login" },
{ source: "/Login", destination: "/auth/login" },
```

Those rewrites cannot make `/auth/login` routable when the destination has no valid Next.js page. There is no `basePath` or `trailingSlash` setting. No `proxy.*` file was found. The root `middleware.ts` is the active middleware file.

## Likely Cause

The login implementation was committed at root-level paths that Next.js does not scan as App Router routes. The `/login` rewrite sends requests to `/auth/login`, but that destination is also outside the valid route tree. Consequently, neither the alias nor canonical destination appears in the build output and both return 404 locally and on Vercel.

## Recommended Fix

Move or recreate the existing login page under a valid route directory, preferably:

```text
app/auth/login/page.tsx
```

Then update its import if necessary so it continues to use the existing `components/auth/LoginForm.tsx`. Preserve the existing Supabase Auth form and middleware redirect behavior. Do not create a second authentication implementation. The existing `/login` rewrite can remain as a compatibility alias after `/auth/login` is a real route.

This recommendation is intentionally not applied because the requested task was diagnosis only.

## Requested Validation

- `npm run lint`: Passed.
- `npm run typecheck`: Passed.
- `npm run build`: Compiled and typechecked; normal local execution stops at Supabase configuration, while the placeholder-only route-generation build completed and omitted both login routes.
- `npm test`: Passed.

No commit or deployment was performed.
