/**
 * GET /api/admin/organizations
 * 
 * Fetch all organizations with status and metadata
 * Requires SUPER_ADMIN role
 * 
 * Query params:
 * - status: ACTIVE, SUSPENDED, PENDING (optional)
 * - search: Organization name search (optional)
 * - page: Pagination page (default: 1)
 * - limit: Results per page (default: 20)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";

export async function GET(request: NextRequest) {
  try {
    const superAdmin = await requireSuperAdmin();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        description,
        status,
        created_at,
        updated_at
      `,
        { count: "exact" }
      );

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: organizations, count: totalCount } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Enhance with member counts
    const withCounts = await Promise.all(
      (organizations || []).map(async (org) => {
        const { count: memberCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);

        const { count: electionCount } = await supabase
          .from("elections")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);

        return {
          ...org,
          memberCount: memberCount || 0,
          electionCount: electionCount || 0,
        };
      })
    );

    // Log access
    await supabase.from("audit_logs").insert({
      actor_id: superAdmin.userId,
      action: "ADMIN_ORGANIZATIONS_VIEWED",
      entity_type: "organizations",
      user_role: "SUPER_ADMIN",
    });

    return NextResponse.json({
      organizations: withCounts,
      pagination: {
        total: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
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

    console.error("Organizations list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
