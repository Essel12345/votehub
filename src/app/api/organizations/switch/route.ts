import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/organization/context";
import { createClient } from "@/lib/supabase/Server";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : null;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationError || !organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ organization_id: organizationId, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, organizationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
