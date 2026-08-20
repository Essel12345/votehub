/**
 * POST /api/admin/organizations/[organizationId]/suspend
 * 
 * Suspend an organization (prevent creating/opening elections, adding voters, changing admins)
 * Requires SUPER_ADMIN role
 * 
 * Body:
 * {
 *   reason: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(request, "ADMIN_SENSITIVE");
    if (!rateLimitResult.allowed) return rateLimitResult.response!;

    const superAdmin = await requireSuperAdmin();
    const { organizationId } = await params;

    const supabase = await createClient();
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim() === "") {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    // Update organization status
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ status: "SUSPENDED", updated_at: new Date().toISOString() })
      .eq("id", organizationId);

    if (updateError) {
      throw updateError;
    }

    // Record suspension in audit trail
    await supabase.from("organization_suspension_audit").insert({
      organization_id: organizationId,
      suspended_by_id: superAdmin.userId,
      suspension_reason: reason,
      suspended_at: new Date().toISOString(),
    });

    // Log audit event
    await supabase.from("audit_logs").insert({
      actor_id: superAdmin.userId,
      organization_id: organizationId,
      action: "ADMIN_ORGANIZATION_SUSPENDED",
      entity_type: "organization",
      entity_id: organizationId,
      user_role: "SUPER_ADMIN",
      metadata: { reason },
    });

    return NextResponse.json({
      success: true,
      message: "Organization suspended",
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

    console.error("Organization suspend error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
