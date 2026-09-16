import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import {
  deletePositionService,
  getPositionForUserService,
  updatePositionService,
} from "@/services/positions/position.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const { id: electionId, positionId } = await params;

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

    const position = await getPositionForUserService(
      user.id,
      electionId,
      positionId
    );

    return NextResponse.json({
      success: true,
      data: position,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load position.";

    return NextResponse.json(
      {
        error: message,
        code: "POSITION_GET_FAILED",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const { id: electionId, positionId } = await params;

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

    const position = await updatePositionService(
      user.id,
      electionId,
      positionId,
      body
    );

    return NextResponse.json({
      success: true,
      data: position,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update position.";

    return NextResponse.json(
      {
        error: message,
        code: "POSITION_UPDATE_FAILED",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const { id: electionId, positionId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await deletePositionService(
      user.id,
      electionId,
      positionId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete position.";

    return NextResponse.json(
      {
        error: message,
        code: "POSITION_DELETE_FAILED",
      },
      { status: 400 }
    );
  }
}
