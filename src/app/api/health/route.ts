/**
 * Health Check Endpoint
 * Returns application and dependency health status
 * Used by load balancers and monitoring systems
 */

import { NextResponse } from "next/server";

export async function GET() {
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
    // Check required environment variables
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

    // Configuration check only.
    // Connectivity is checked by the authenticated system-health endpoint.
    checks.database = "configured";

    // Check Supabase authentication configuration
    if (
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      checks.auth = "configured";
    } else {
      checks.auth = "not_configured";
      status = "degraded";
    }

    const responseTime = Date.now() - startTime;
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
  } catch {
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

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
