import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import {
  deleteCandidateService,
  getCandidateForUser,
  updateCandidateService,
} from "@/services/candidates/candidate.service";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      positionId: string;
      candidateId: string;
    }>;
  }
) {
  try {
    const { candidateId } = await params;

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

    const candidate = await getCandidateForUser(
      user.id,
      candidateId
    );

    return NextResponse.json({
      success: true,
      data: candidate,
    });
  } catch (error: unknown) {
    console.error("CANDIDATE_GET_FAILED:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to load candidate.";

    return NextResponse.json(
      {
        error: message,
        code: "CANDIDATE_GET_FAILED",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      positionId: string;
      candidateId: string;
    }>;
  }
) {
  try {
    const { candidateId } = await params;

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

    const candidate = await updateCandidateService(
      user.id,
      candidateId,
      body
    );

    return NextResponse.json({
      success: true,
      data: candidate,
    });
  } catch (error: unknown) {
    console.error("CANDIDATE_UPDATE_FAILED:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update candidate.";

    return NextResponse.json(
      {
        error: message,
        code: "CANDIDATE_UPDATE_FAILED",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      positionId: string;
      candidateId: string;
    }>;
  }
) {
  try {
    const { candidateId } = await params;

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

    await deleteCandidateService(
      user.id,
      candidateId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    console.error("CANDIDATE_DELETE_FAILED:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete candidate.";

    return NextResponse.json(
      {
        error: message,
        code: "CANDIDATE_DELETE_FAILED",
      },
      { status: 400 }
    );
  }
}
