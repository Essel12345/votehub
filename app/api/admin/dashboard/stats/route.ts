/**
 * GET /api/admin/dashboard/stats
 * 
 * Fetch platform-wide statistics for the admin dashboard
 * Requires SUPER_ADMIN role
 * Rate limited: 100 requests per minute per user
 * 
 * Returns:
 * {
 *   totalOrganizations: number,
 *   activeOrganizations: number,
 *   suspendedOrganizations: number,
 *   pendingOrganizations: number,
 *   totalUsers: number,
 *   usersByRole: { role: count },
 *   totalElections: number,
 *   electionsByStatus: { status: count },
 *   totalVoters: number,
 *   submittedBallots: number,
 *   avgTurnout: number
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function GET() {
  // Apply rate limiting: 100 requests per minute per user
  const request = new NextRequest(new URL("http://localhost:3000/api/admin/dashboard/stats"));
  const rateLimitResult = await applyRateLimit(request, "ADMIN_API");
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  try {
    // Verify super admin authorization
    const superAdmin = await requireSuperAdmin();

    const supabase = await createClient();

    // Get organization statistics
    const { data: orgStats, count: orgTotalCount } = await supabase
      .from("organizations")
      .select("status, id", { count: "exact" });

    // Get user statistics by role
    const { data: usersByRole, count: userTotalCount } = await supabase
      .from("profiles")
      .select("role", { count: "exact" });

    // Get election statistics
    const { data: electionStats } = await supabase
      .from("elections")
      .select("status, id", { count: "exact" });

    // Get voting statistics
    const { data: voterStats } = await supabase
      .from("election_voters")
      .select("status, voted_at");

    // Calculate aggregations
    const stats = {
      totalOrganizations: orgTotalCount || 0,
      activeOrganizations: orgStats?.filter((o) => o.status === "ACTIVE").length || 0,
      suspendedOrganizations: orgStats?.filter((o) => o.status === "SUSPENDED").length || 0,
      pendingOrganizations: orgStats?.filter((o) => o.status === "PENDING").length || 0,

      totalUsers: userTotalCount || 0,
      superAdminUsers: usersByRole?.filter((u) => u.role === "SUPER_ADMIN").length || 0,
      orgAdminUsers: usersByRole?.filter((u) => u.role === "ORGANIZATION_ADMIN").length || 0,
      officerUsers: usersByRole?.filter((u) => u.role === "ELECTION_OFFICER").length || 0,
      candidateUsers: usersByRole?.filter((u) => u.role === "CANDIDATE").length || 0,
      voterUsers: usersByRole?.filter((u) => u.role === "VOTER").length || 0,

      totalElections: electionStats?.length || 0,
      draftElections: electionStats?.filter((e) => e.status === "DRAFT").length || 0,
      publishedElections: electionStats?.filter((e) => e.status === "PUBLISHED").length || 0,
      openElections: electionStats?.filter((e) => e.status === "OPEN").length || 0,
      closedElections: electionStats?.filter((e) => e.status === "CLOSED").length || 0,

      totalVoters: voterStats?.filter((v) => v.status === "ELIGIBLE").length || 0,
      submittedBallots: voterStats?.filter((v) => v.voted_at !== null).length || 0,
      avgTurnout: voterStats && voterStats.length > 0
        ? Math.round((voterStats.filter((v) => v.voted_at !== null).length / voterStats.length) * 100)
        : 0,
    };

    // Log this access for audit purposes
    await supabase.from("audit_logs").insert({
      actor_id: superAdmin.userId,
      action: "ADMIN_DASHBOARD_VIEWED",
      entity_type: "dashboard",
      user_role: "SUPER_ADMIN",
    });

    return NextResponse.json(stats);
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

    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
