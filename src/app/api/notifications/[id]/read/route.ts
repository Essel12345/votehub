/**
 * POST /api/notifications/[id]/read
 * Mark a specific notification as read
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/Server";
import { markNotificationAsRead } from "@/lib/notifications/notification.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = id;
    const userId = user.data.user.id;

    // Verify the notification belongs to the user
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("id, recipient_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (notification.recipient_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Mark as read
    const success = await markNotificationAsRead(notificationId, userId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
