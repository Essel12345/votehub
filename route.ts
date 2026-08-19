/**
 * GET /api/notifications
 * List user's notifications with pagination
 * Query params: page=1, limit=20, status=QUEUED|SENT|READ|ALL
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/Server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.data.user.id;
    const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "20"), 100);
    const status = request.nextUrl.searchParams.get("status") ?? "ALL";

    const offset = (page - 1) * limit;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false });

    if (status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Failed to fetch notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: data ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
