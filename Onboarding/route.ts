import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/Server";
import { onboardOrganization } from "@/services/Organizations/Organization.service";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await request.json();

  await onboardOrganization(user.id, body);

  return NextResponse.json({
    success: true,
    message: "Organization onboarding completed.",
  });
}