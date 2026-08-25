import { NextResponse, NextRequest } from "next/server";

import { registerOrganization } from "@/services/auth.service";
import { registerSchema } from "@/lib/validation/auth";
import { applyRateLimit } from "@/lib/security/rate-limit.service";

export async function POST(request: NextRequest) {
  // Apply rate limiting: 5 registrations per hour per IP
  const rateLimitResult = await applyRateLimit(request, "REGISTER");
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid registration payload.",
          code: "INVALID_INPUT",
        },
        { status: 400 }
      );
    }

    const result = await registerOrganization(parsed.data, crypto.randomUUID());

    return NextResponse.json(
      {
        success: true,
        message: "Organization created successfully.",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";

    return NextResponse.json(
      {
        error: message,
        code: "REGISTRATION_FAILED",
      },
      { status: 400 }
    );
  }
}