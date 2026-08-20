/**
 * GET /api/notification-preferences
 * Fetch user's notification preferences for their organization
 * 
 * PATCH /api/notification-preferences
 * Update user's notification preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/Server";
import { getProfile } from "@/repositories/Profile.repository";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.data.user.id;
    const profile = await getProfile(userId);

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "No organization associated with user" },
        { status: 400 }
      );
    }

    // Fetch existing preferences or create defaults
    const { data: existingPrefs, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch notification preferences:", error);
      return NextResponse.json(
        { error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    // If preferences don't exist, create default ones
    if (!existingPrefs) {
      const { data: newPrefs, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: userId,
          organization_id: profile.organization_id,
          email_enabled: true,
          in_app_enabled: true,
          email_on_invitation: true,
          email_on_election_created: true,
          email_on_election_published: false,
          email_on_election_opened: false,
          email_on_election_closing_soon: true,
          email_on_election_closed: false,
          email_on_candidate_approved: true,
          email_on_candidate_rejected: true,
          email_on_ballot_submitted: true,
          email_on_results_published: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create default preferences:", insertError);
        return NextResponse.json(
          { error: "Failed to create preferences" },
          { status: 500 }
        );
      }

      return NextResponse.json(newPrefs);
    }

    return NextResponse.json(existingPrefs);
  } catch (error) {
    console.error("Notification preferences API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.data.user.id;
    const profile = await getProfile(userId);

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "No organization associated with user" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate the preferences object
    const allowedFields = [
      "email_enabled",
      "in_app_enabled",
      "email_on_invitation",
      "email_on_election_created",
      "email_on_election_published",
      "email_on_election_opened",
      "email_on_election_closing_soon",
      "email_on_election_closed",
      "email_on_candidate_approved",
      "email_on_candidate_rejected",
      "email_on_ballot_submitted",
      "email_on_results_published",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update preferences
    const { data, error } = await supabase
      .from("notification_preferences")
      .update(updates)
      .eq("user_id", userId)
      .eq("organization_id", profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update notification preferences:", error);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: data,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
