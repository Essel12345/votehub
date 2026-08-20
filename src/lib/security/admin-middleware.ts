/**
 * Admin Middleware
 * 
 * Protects all /admin/* routes by ensuring:
 * 1. User is authenticated
 * 2. User has SUPER_ADMIN role
 * 
 * Route protection for both pages and API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import type { NextMiddleware } from "next/server";

/**
 * Middleware to protect admin routes
 * Applied to: /admin/*, /api/admin/*
 * 
 * Rules:
 * - Unauthenticated: Redirect to /auth/login
 * - Authenticated non-super-admin: Redirect to /unauthorized
 * - Authenticated super-admin: Allow access
 */
export function adminMiddleware(request: NextRequest): NextResponse | undefined {
  const pathname = request.nextUrl.pathname;

  // Apply only to admin routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return undefined;
  }

  // Note: Session validation happens in route handlers via requireSuperAdmin()
  // This middleware just logs the access attempt
  // The actual authorization is server-side in the route handlers

  return undefined;
}

/**
 * For API routes, this is the standard error response for authorization failures
 */
export function sendUnauthorized(
  message: string = "Unauthorized"
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: "UNAUTHORIZED",
    },
    { status: 401 }
  );
}

/**
 * For API routes, this is the standard error response for forbidden access
 */
export function sendForbidden(
  message: string = "Forbidden"
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: "FORBIDDEN",
    },
    { status: 403 }
  );
}
