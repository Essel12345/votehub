import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import { transitionElectionStatusService } from "@/services/elections/election.service";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await applyRateLimit(request, "ADMIN_SENSITIVE");
    if (!rateLimitResult.allowed) return rateLimitResult.response!;

    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const nextStatus = typeof body?.status === "string" ? body.status : "";

    if (!nextStatus) {
      return NextResponse.json({ error: "A status is required.", code: "INVALID_STATUS" }, { status: 400 });
    }

    const election = await transitionElectionStatusService(user.id, id, nextStatus);
    return NextResponse.json({ success: true, data: election });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update election status.";
    return NextResponse.json({ error: message, code: "ELECTION_STATUS_UPDATE_FAILED" }, { status: 400 });
  }
}
