import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import {
  getElectionForUser,
  updateElectionService,
  deleteElectionService,
} from "@/services/elections/election.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const election = await getElectionForUser(user.id, id);
    return NextResponse.json({ success: true, data: election });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load election.";
    return NextResponse.json({ error: message, code: "ELECTION_FETCH_FAILED" }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const election = await updateElectionService(user.id, id, body);
    return NextResponse.json({ success: true, data: election });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update election.";
    return NextResponse.json({ error: message, code: "ELECTION_UPDATE_FAILED" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    await deleteElectionService(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to delete election.";
    return NextResponse.json({ error: message, code: "ELECTION_DELETE_FAILED" }, { status: 400 });
  }
}
