/**
 * GET /api/admin/users
 * 
 * Fetch all users with filtering and search
 * Requires SUPER_ADMIN role
 * 
 * Query params:
 * - role: SUPER_ADMIN, ORGANIZATION_ADMIN, ELECTION_OFFICER, CANDIDATE, VOTER (optional)
 * - organization_id: Filter by organization (optional)
 * - search: Search by email or name (optional)
 * - status: ACTIVE, INACTIVE (optional)
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
    const role = searchParams.get("role");
    const organizationId = searchParams.get("organization_id");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        full_name,
        organization_id,
        role,
        is_active,
        created_at,
        updated_at
      `,
        { count: "exact" }
      );

    if (role) {
      query = query.eq("role", role);
    }

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (status === "INACTIVE") {
      query = query.eq("is_active", false);
    } else if (status === "ACTIVE") {
      query = query.eq("is_active", true);
    }

    if (search) {
      // Search by email or name
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, count: totalCount } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Get organization names for users
    const withOrgNames = await Promise.all(
      (users || []).map(async (user) => {
        if (!user.organization_id) {
          return { ...user, organizationName: null };
        }

        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", user.organization_id)
          .single();

        return { ...user, organizationName: org?.name || null };
      })
    );

    // Log access
    await supabase.from("audit_logs").insert({
      actor_id: superAdmin.userId,
      action: "ADMIN_USERS_VIEWED",
      entity_type: "users",
      user_role: "SUPER_ADMIN",
    });

    return NextResponse.json({
      users: withOrgNames,
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

    console.error("Users list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
