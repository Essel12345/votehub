/**
 * POST /api/admin/users/[userId]/role
 * 
 * Change a user's role
 * Requires SUPER_ADMIN role
 * 
 * Body:
 * {
 *   newRole: string (SUPER_ADMIN, ORGANIZATION_ADMIN, ELECTION_OFFICER, CANDIDATE, VOTER)
 *   reason: string
 *   organizationId?: string (required if changing to ORGANIZATION_ADMIN)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";
import { getProfile } from "@/repositories/Profile.repository";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

const VALID_ROLES = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "ELECTION_OFFICER", "CANDIDATE", "VOTER"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(request, "ADMIN_SENSITIVE");
    if (!rateLimitResult.allowed) return rateLimitResult.response!;

    const superAdmin = await requireSuperAdmin();
    const { userId } = await params;

    const supabase = await createClient();
    const body = await request.json();
    const { newRole, reason, organizationId } = body;

    if (!newRole || !VALID_ROLES.includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    // Get user's current role
    const currentProfile = await getProfile(userId);
    if (!currentProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const oldRole = currentProfile.role;

    // If changing to ORGANIZATION_ADMIN, ensure organizationId is provided
    if (newRole === "ORGANIZATION_ADMIN" && !organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required for ORGANIZATION_ADMIN role" },
        { status: 400 }
      );
    }

    // Update user's role
    const updateData: Record<string, unknown> = { 
      role: newRole,
      updated_at: new Date().toISOString()
    };

    if (newRole === "ORGANIZATION_ADMIN") {
      updateData.organization_id = organizationId;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      throw updateError;
    }

    // Record role change in audit trail
    await supabase.from("user_role_audit").insert({
      user_id: userId,
      changed_by_id: superAdmin.userId,
      old_role: oldRole,
      new_role: newRole,
      reason,
      organization_id: organizationId,
    });

    // Log audit event
    await supabase.from("audit_logs").insert({
      actor_id: superAdmin.userId,
      action: "ADMIN_USER_ROLE_CHANGED",
      entity_type: "user",
      entity_id: userId,
      user_role: "SUPER_ADMIN",
      metadata: { oldRole, newRole, reason },
    });

    return NextResponse.json({
      success: true,
      message: "User role changed",
      oldRole,
      newRole,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (message === "Forbidden") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    console.error("User role change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
