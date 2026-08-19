/**
 * Health Check Endpoint
 * Returns application and dependency health status
 * Used by load balancers and monitoring systems
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const version = process.env.APP_VERSION || "1.0.0";
  const checks: Record<string, string> = {
    database: "unknown",
    auth: "unknown",
    environment: "unknown",
  };

  try {
    // Check environment variables are set
    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY ||
      !process.env.DATABASE_URL
    ) {
      checks.environment = "missing_variables";
      status = "unhealthy";
    } else {
      checks.environment = "configured";
    }

    // This endpoint validates configuration only; connectivity is checked by the
    // authenticated system-health endpoint to avoid an unauthenticated DB query.
    checks.database = "configured";

    // Check auth provider configuration
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL) {
      checks.auth = "configured";
    } else {
      checks.auth = "not_configured";
      status = "degraded";
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Return 200 if healthy or degraded, 503 if unhealthy
    const statusCode = status === "unhealthy" ? 503 : 200;

    return NextResponse.json(
      {
        status,
        timestamp,
        uptime,
        version,
        checks,
        responseTime,
      },
      { status: statusCode }
    );
  } catch (error) {
    // Even if error, don't expose error details
    const responseTime = Date.now() - startTime;
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        responseTime,
        error: "Health check failed",
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD request support (for load balancers that prefer HEAD)
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
