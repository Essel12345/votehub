/**
 * Super Admin Authorization Service
 * 
 * Centralized authorization for all Super Admin operations.
 * NEVER trust client-provided role, org_id, or user_id values.
 * Always validate server-side using secure session state.
 */

import { createClient } from "@/lib/supabase/Server";
import { getProfile } from "@/repositories/Profile.repository";

export interface SuperAdminContext {
  userId: string;
  email: string;
  role: string;
  profile: unknown;
}

/**
 * Verify that the authenticated user is a Super Admin
 * 
 * This function:
 * - Gets the session from Supabase auth (server-side, secure)
 * - Validates the user's role from the database
 * - Returns the super admin context
 * - Throws 401 if not authenticated
 * - Throws 403 if not a super admin
 * 
 * CRITICAL: Never use client-provided values for role checking
 * 
 * @returns SuperAdminContext with verified user info
 * @throws Error with message "Unauthorized" (401) if not authenticated
 * @throws Error with message "Forbidden" (403) if not a super admin
 */
export async function requireSuperAdmin(): Promise<SuperAdminContext> {
  const supabase = await createClient();

  // Get the session from Supabase auth (server-side, secure)
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session || !session.user) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  // Get the user's profile from database to verify role
  // This is the source of truth for roles, not client-provided values
  const profile = await getProfile(userId);

  if (!profile) {
    throw new Error("Unauthorized");
  }

  // Verify the user is a SUPER_ADMIN
  if (profile.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }

  return {
    userId,
    email: userEmail || "",
    role: profile.role,
    profile,
  };
}

/**
 * Verify that the authenticated user has the required role
 * 
 * This function validates roles server-side without trusting client values.
 * 
 * @param requiredRoles - One or more roles that satisfy the requirement
 * @returns Profile if user has one of the required roles
 * @throws Error with message "Unauthorized" (401) if not authenticated
 * @throws Error with message "Forbidden" (403) if user doesn't have required role
 */
export async function requireRole(
  requiredRoles: string | string[]
): Promise<unknown> {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session || !session.user) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const profile = await getProfile(userId);

  if (!profile) {
    throw new Error("Unauthorized");
  }

  const roles = Array.isArray(requiredRoles)
    ? requiredRoles
    : [requiredRoles];

  if (!roles.includes(profile.role)) {
    throw new Error("Forbidden");
  }

  return profile;
}

/**
 * Get the current user's profile without role restrictions
 * Used for retrieving general user information
 * 
 * @returns User profile if authenticated
 * @throws Error if not authenticated
 */
export async function getCurrentUser(): Promise<unknown> {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session || !session.user) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const profile = await getProfile(userId);

  if (!profile) {
    throw new Error("Unauthorized");
  }

  return profile;
}

/**
 * Check if a user is a Super Admin without throwing
 * Returns boolean instead of throwing
 * 
 * @param userId - User ID to check (still verified via database)
 * @returns true if user is a SUPER_ADMIN, false otherwise
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return profile?.role === "SUPER_ADMIN";
}

/**
 * Verify organization membership and admin role for that organization
 * Ensures user can manage the specified organization
 * 
 * @param organizationId - Organization ID to manage
 * @returns Organization admin profile
 * @throws Error if not authenticated or not org admin for that org
 */
export async function requireOrgAdmin(
  organizationId: string
): Promise<unknown> {
  const profile = await requireRole(["ORGANIZATION_ADMIN", "SUPER_ADMIN"]);

  // Type-narrow profile for property access
  const profileObj = profile as Record<string, unknown>;

  // Super admins can manage any organization
  if (profileObj.role === "SUPER_ADMIN") {
    return profile;
  }

  // Organization admins can only manage their own organization
  if (profileObj.organization_id !== organizationId) {
    throw new Error("Forbidden");
  }

  return profile;
}
