/**
 * GET /api/admin/elections
 * 
 * List all elections on platform with filtering and stats
 * Requires SUPER_ADMIN role
 * Rate limited: 100 requests per minute per user
 * 
 * Query params:
 * - status: DRAFT, PUBLISHED, OPEN, CLOSED (optional)
 * - organization_id: Filter by organization (optional)
 * - search: Search by election name (optional)
 * - page: Pagination page (default: 1)
 * - limit: Results per page (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function GET(request: NextRequest) {
  // Apply rate limiting: 100 requests per minute per user
  const rateLimitResult = await applyRateLimit(request, "ADMIN_API");
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const organizationId = searchParams.get("organization_id");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("elections")
      .select(
        `
        id,
        organization_id,
        title,
        status,
        start_date,
        end_date,
        created_at
      `,
        { count: "exact" }
      );

    if (status) {
      query = query.eq("status", status);
    }

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data: elections, count: totalCount } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Enhance with organization names and voter/ballot counts
    const enhanced = await Promise.all(
      (elections || []).map(async (election) => {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", election.organization_id)
          .single();

        const { count: voterCount } = await supabase
          .from("election_voters")
          .select("id", { count: "exact", head: true })
          .eq("election_id", election.id);

        const { count: ballotCount } = await supabase
          .from("ballots")
          .select("id", { count: "exact", head: true })
          .eq("election_id", election.id);

        return {
          ...election,
          organizationName: org?.name || "Unknown",
          voterCount: voterCount || 0,
          ballotCount: ballotCount || 0,
        };
      })
    );

    return NextResponse.json({
      elections: enhanced,
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

    console.error("Elections list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
