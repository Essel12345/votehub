/**
 * GET /api/admin/audit-logs
 * 
 * Fetch platform-level audit logs
 * Requires SUPER_ADMIN role
 * Rate limited: 100 requests per minute per user
 * 
 * Query params:
 * - organization_id: Filter by organization (optional)
 * - actor_id: Filter by actor (optional)
 * - action: Filter by action (optional)
 * - entity_type: Filter by entity type (optional)
 * - start_date: ISO date string (optional)
 * - end_date: ISO date string (optional)
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
    const organizationId = searchParams.get("organization_id");
    const actorId = searchParams.get("actor_id");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entity_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("audit_logs")
      .select(
        `
        id,
        organization_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata,
        user_role,
        created_at
      `,
        { count: "exact" }
      );

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (actorId) {
      query = query.eq("actor_id", actorId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, count: totalCount } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Enhance logs with actor names and organization names
    const withNames = await Promise.all(
      (logs || []).map(async (log) => {
        let actorName = "Unknown";
        if (log.actor_id) {
          const { data: actor } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", log.actor_id)
            .single();
          actorName = actor?.full_name || actor?.email || "Unknown";
        }

        let organizationName = null;
        if (log.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", log.organization_id)
            .single();
          organizationName = org?.name || null;
        }

        return { ...log, actorName, organizationName };
      })
    );

    return NextResponse.json({
      logs: withNames,
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

    console.error("Audit logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
