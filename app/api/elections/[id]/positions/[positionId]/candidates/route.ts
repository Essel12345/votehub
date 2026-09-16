import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import {
  createCandidateService,
  listCandidatesForPositionService,
} from "@/services/candidates/candidate.service";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; positionId: string }>;
  }
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
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const candidates = await listCandidatesForPositionService(
      user.id,
      electionId,
      positionId
    );

    return NextResponse.json({
      success: true,
      data: candidates,
    });
  } catch (error: unknown) {
    console.error("CANDIDATE_LIST_FAILED:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load candidates.";

    return NextResponse.json(
      {
        error: message,
        code: "CANDIDATE_LIST_FAILED",
      },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; positionId: string }>;
  }
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
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const candidate = await createCandidateService(
      user.id,
      electionId,
      positionId,
      body
    );

    return NextResponse.json(
      {
        success: true,
        data: candidate,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("CANDIDATE_CREATE_FAILED:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create candidate.";

    return NextResponse.json(
      {
        error: message,
        code: "CANDIDATE_CREATE_FAILED",
      },
      { status: 400 }
    );
  }
}
