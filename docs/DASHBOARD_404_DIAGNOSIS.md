# Dashboard 404 Diagnosis

**Date:** 2026-08-21
**Scope:** Deployed staging `GET /dashboard`
**Deployment changes:** None

## 1. Dashboard Route Source File

The apparent dashboard page is:

```text
Dashboard/page.tsx
```

There are also dashboard-related files under `dashboard/`, including `dashboard/page.tsx`. However, the active root App Router is `app/`, not `Dashboard/` or `dashboard/`.

The repository does not contain:

```text
app/dashboard/page.tsx
```

The `src/app` tree also does not contain `src/app/dashboard/page.tsx`; the listed `src/app/dashboard` paths are not present in this workspace. The `src/app` directory is not the configured active App Router root for this build.

## 2. Expected Route

The login flow navigates to:

```text
/dashboard
```

For the active App Router, the expected source location is:

```text
app/dashboard/page.tsx
```

## 3. Whether the Route Exists

No. There is no `/dashboard` page in the active `app/` App Router tree.

`Dashboard/page.tsx` is outside the active App Router and uses a capitalized directory name. The separate lowercase `dashboard/` directory is also outside the active `app/` tree. Neither directory creates the `/dashboard` route in this build.

## 4. Whether the Route Is Tracked

The dashboard-related files are tracked by Git, including:

- `Dashboard/page.tsx`
- `dashboard/page.tsx`
- the other files under `dashboard/`
- the active `middleware.ts`
- `next.config.js`

Being tracked does not make a file a Next.js route. The issue is the file location relative to the active App Router root, not Git omission.

## 5. Whether the Build Includes `/dashboard`

The successful production build route table does **not** include `/dashboard`. It includes `/admin` routes and `/auth/login`, but no dashboard page route.

The first build without environment values compiled successfully but stopped during page-data collection because `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were missing. A second build with non-secret placeholder values completed successfully and confirmed that `/dashboard` is absent from the production route table.

## 6. Local Production Result

With the successful production build running locally, a request to:

```text
http://localhost:3000/dashboard
```

returned:

```text
HTTP 307
Location: /auth/login?redirectTo=%2Fdashboard
```

This is an authentication redirect, not a route 404. It occurs because middleware protects `/dashboard` and no authenticated session was supplied. The route-table result independently shows that the page itself is not built as `/dashboard`; an authenticated request would reach the missing-route behavior.

## 7. Middleware Behavior

`middleware.ts`:

- matches `/dashboard/:path*` through `config.matcher`;
- also checks `/dashboard` and `/dashboard/` in `protectedRoutes`;
- creates a Supabase server client and calls `supabase.auth.getUser()`;
- redirects unauthenticated requests to `/auth/login?redirectTo=/dashboard`;
- returns `NextResponse.next()` for authenticated requests;
- does not rewrite `/dashboard`;
- does not change the pathname.

Middleware is not the source of the deployed 404. It explains the local 307 authentication redirect.

## 8. Next.js Configuration

`next.config.js` contains:

- `reactStrictMode: true`;
- rewrites from `/login` and `/Login` to `/auth/login`;
- security headers for all paths.

It does not define `basePath`, `trailingSlash`, a `/dashboard` rewrite, a `/dashboard` redirect, or experimental routing settings affecting this path.

## 9. Root Cause

The dashboard page is stored outside the active App Router root. Next.js therefore does not discover it as `/dashboard`, and the production route table omits `/dashboard`. The deployed Vercel 404 is the expected result of deploying this route tree.

The dashboard files being tracked by Git does not resolve the routing issue. The route is absent from the build because no `app/dashboard/page.tsx` exists under the active root.

## 10. Minimal Recommended Fix

Place or otherwise expose the existing dashboard page through the active App Router at:

```text
app/dashboard/page.tsx
```

Preserve the existing authentication and middleware behavior. After the route is placed under the active root, verify that `npm run build` lists `/dashboard`, test the local production response with and without an authenticated session, and only then consider deployment.

No route, middleware, authentication, configuration, or dashboard files were modified for this diagnosis.

## Validation

The requested validation commands were run after creating this document:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`

No deployment or commit was performed.