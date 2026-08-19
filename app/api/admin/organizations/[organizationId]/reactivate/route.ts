/**
 * POST /api/admin/organizations/[organizationId]/reactivate
 * 
 * Reactivate a suspended organization
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

    // Update organization status back to ACTIVE
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
      .eq("id", organizationId);

    if (updateError) {
      throw updateError;
    }

    // Record reactivation in audit trail
    const { data: suspension } = await supabase
      .from("organization_suspension_audit")
      .select("id")
      .eq("organization_id", organizationId)
      .is("resumed_at", null)
      .order("suspended_at", { ascending: false })
      .limit(1)
      .single();

    if (suspension) {
      await supabase
        .from("organization_suspension_audit")
        .update({
          resumed_by_id: superAdmin.userId,
          resumption_reason: reason,
          resumed_at: new Date().toISOString(),
        })
        .eq("id", suspension.id);
    }

    // Log audit event
    await supabase.from("audit_logs").insert({
      actor_id: superAdmin.userId,
      organization_id: organizationId,
      action: "ADMIN_ORGANIZATION_REACTIVATED",
      entity_type: "organization",
      entity_id: organizationId,
      user_role: "SUPER_ADMIN",
      metadata: { reason },
    });

    return NextResponse.json({
      success: true,
      message: "Organization reactivated",
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

    console.error("Organization reactivate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
