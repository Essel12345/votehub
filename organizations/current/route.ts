import { NextResponse } from "next/server";

import { getCurrentOrganization, getCurrentProfile } from "@/lib/organization/context";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = await getCurrentOrganization();
    const availableOrganizations = profile.organization_id
      ? [{ id: organization.id, name: organization.name, slug: organization.slug, status: organization.status }]
      : [];

    return NextResponse.json({
      profile,
      organization,
      availableOrganizations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Organization membership required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
