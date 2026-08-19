/**
 * GET /api/admin/users/[userId]
 * 
 * Fetch user details with organizations and role history
 * Requires SUPER_ADMIN role
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { userId } = await params;
    const supabase = await createClient();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get organization details if org admin
    let organization = null;
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, status")
        .eq("id", profile.organization_id)
        .single();
      organization = org;
    }

    // Get role change history
    const { data: roleHistory } = await supabase
      .from("user_role_audit")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at")
      .eq("actor_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      profile,
      organization,
      roleHistory: roleHistory || [],
      recentActivity: recentActivity || [],
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

    console.error("User detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
