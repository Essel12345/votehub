/**
 * GET /api/admin/security/events
 * 
 * Fetch security events (failed logins, permission denied, role changes, etc)
 * Requires SUPER_ADMIN role
 * Rate limited: 100 requests per minute per user
 * 
 * Query params:
 * - type: failed_login, permission_denied, role_changed, org_suspended (optional)
 * - start_date: ISO date string (optional)
 * - end_date: ISO date string (optional)
 * - page: Pagination page (default: 1)
 * - limit: Results per page (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

const SECURITY_ACTIONS = [
  "ADMIN_ORGANIZATION_SUSPENDED",
  "ADMIN_USER_ROLE_CHANGED",
  "ADMIN_USER_SUSPENDED",
  "AUTH_FAILED_LOGIN",
  "ACCESS_DENIED",
];

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
    const type = searchParams.get("type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build query for security events
    let query = supabase
      .from("audit_logs")
      .select(
        `
        id,
        actor_id,
        action,
        entity_type,
        metadata,
        user_role,
        created_at
      `,
        { count: "exact" }
      )
      .in("action", SECURITY_ACTIONS);

    if (type) {
      query = query.eq("action", type);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: events, count: totalCount } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Enhance with actor names
    const withNames = await Promise.all(
      (events || []).map(async (event) => {
        let actorName = "Unknown";
        if (event.actor_id) {
          const { data: actor } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", event.actor_id)
            .single();
          actorName = actor?.full_name || actor?.email || "Unknown";
        }

        return { ...event, actorName };
      })
    );

    return NextResponse.json({
      events: withNames,
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

    console.error("Security events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
