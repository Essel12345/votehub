/**
 * POST /api/notifications/read-all
 * Mark all user notifications as read
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/Server";
import { markAllNotificationsAsRead } from "@/lib/notifications/notification.service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.data.user.id;

    // Mark all as read
    const count = await markAllNotificationsAsRead(userId);

    return NextResponse.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      count,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
