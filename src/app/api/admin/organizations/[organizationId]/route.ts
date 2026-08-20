/**
 * GET /api/admin/organizations/[organizationId]
 * 
 * Fetch organization details with members and elections
 * Requires SUPER_ADMIN role
 * Rate limited: 100 requests per minute per user
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  // Apply rate limiting: 100 requests per minute per user
  const rateLimitResult = await applyRateLimit(request, "ADMIN_API");
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  try {
    await requireSuperAdmin();
    const { organizationId } = await params;
    const supabase = await createClient();

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get member count with roles
    const { data: members } = await supabase
      .from("profiles")
      .select("id, email, full_name, role", { count: "exact" })
      .eq("organization_id", organizationId);

    // Get election count
    const { count: electionCount } = await supabase
      .from("elections")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    // Get recent admins
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("organization_id", organizationId)
      .eq("role", "ORGANIZATION_ADMIN")
      .limit(5);

    return NextResponse.json({
      organization: org,
      members: members || [],
      memberCount: members?.length || 0,
      electionCount: electionCount || 0,
      admins: admins || [],
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

    console.error("Organization detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
