/**
 * GET /api/admin/system-health
 * 
 * Fetch system health status including database, auth, email provider
 * Requires SUPER_ADMIN role
 * 
 * IMPORTANT: Never returns API keys, secrets, or connection strings
 * Returns only health status indicators
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/security/super-admin.service";
import { createClient } from "@/lib/supabase/Server";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(request, "ADMIN_SENSITIVE");
    if (!rateLimitResult.allowed) return rateLimitResult.response!;

    const adminUserId = await requireSuperAdmin();
    const supabase = await createClient();

    const health: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      services: {} as Record<string, unknown>,
    };

    const services = health.services as Record<string, unknown>;

    // Check database connectivity
    try {
      const { error: dbError } = await supabase
        .from("organizations")
        .select("id", { count: "exact", head: true });

      services.database = {
        status: dbError ? "down" : "up",
        lastChecked: new Date().toISOString(),
      };
    } catch {
      services.database = {
        status: "down",
        error: "Connection failed",
        lastChecked: new Date().toISOString(),
      };
    }

    // Check auth connectivity
    try {
      const { data: session } = await supabase.auth.getSession();
      services.auth = {
        status: session ? "up" : "degraded",
        lastChecked: new Date().toISOString(),
      };
    } catch {
      services.auth = {
        status: "down",
        error: "Auth check failed",
        lastChecked: new Date().toISOString(),
      };
    }

    // Check email provider configuration (without returning secrets)
    const emailProvider = process.env.EMAIL_PROVIDER || "smtp";
    const hasEmailKey = !!process.env.EMAIL_API_KEY;
    services.email = {
      status: hasEmailKey ? "configured" : "unconfigured",
      provider: emailProvider,
      lastChecked: new Date().toISOString(),
    };

    // System information (non-sensitive only)
    health.system = {
      version: process.env.APP_VERSION || "unknown",
      environment: process.env.NODE_ENV || "unknown",
      uptime: process.uptime(),
    };

    // Overall health
    const allServicesHealthy = Object.values(services).every(
      (service) => {
        const srv = service as Record<string, unknown>;
        return srv.status === "up" || srv.status === "configured";
      }
    );
    health.status = allServicesHealthy ? "healthy" : "degraded";

    // Log access
    await supabase.from("audit_logs").insert({
      actor_id: adminUserId,
      action: "ADMIN_SYSTEM_HEALTH_VIEWED",
      entity_type: "system_health",
      user_role: "SUPER_ADMIN",
    });

    return NextResponse.json(health);
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

    console.error("System health error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
