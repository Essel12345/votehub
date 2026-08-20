import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import { withdrawCandidateService } from "@/services/candidates/candidate.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const candidate = await withdrawCandidateService(user.id, candidateId);
    return NextResponse.json({ success: true, data: candidate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to withdraw candidate.";
    return NextResponse.json({ error: message, code: "CANDIDATE_WITHDRAW_FAILED" }, { status: 400 });
  }
}
