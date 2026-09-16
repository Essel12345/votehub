import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import {
  createPositionService,
  listPositionsForElectionService,
} from "@/services/positions/position.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

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

    const positions = await listPositionsForElectionService(
      user.id,
      electionId
    );

    return NextResponse.json({
      success: true,
      data: positions,
    });
  } catch (error: unknown) {
    console.error("POSITION_LIST_FAILED:", error);

    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String((error as { message?: unknown }).message)
          : "Unable to load positions.";

    return NextResponse.json(
      {
        error: message,
        code: "POSITION_LIST_FAILED",
      },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: electionId } = await params;

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

    const position = await createPositionService(
      user.id,
      electionId,
      body
    );

    return NextResponse.json(
      {
        success: true,
        data: position,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POSITION_CREATE_FAILED:", error);

    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String((error as { message?: unknown }).message)
          : "Unable to create position.";

    return NextResponse.json(
      {
        error: message,
        code: "POSITION_CREATE_FAILED",
      },
      { status: 400 }
    );
  }
}
