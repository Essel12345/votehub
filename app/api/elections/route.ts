import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import { createElectionService, listMyElections } from "@/services/elections/election.service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const elections = await listMyElections(user.id);
    return NextResponse.json({ data: elections, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load elections.";
    return NextResponse.json(
      { error: message, code: "ELECTION_LIST_FAILED" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const election = await createElectionService(user.id, body);

    return NextResponse.json(
      { success: true, data: election },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to create election.";
    return NextResponse.json(
      { error: message, code: "ELECTION_CREATE_FAILED" },
      { status: 400 }
    );
  }
}