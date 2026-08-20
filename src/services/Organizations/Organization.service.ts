import { createOrganization } from "@/repositories/Organization.repository";
import { getProfile } from "@/repositories/Profile.repository";

import { createSlug } from "@/lib/utils/slug";

export async function onboardOrganization(
  userId: string,
  data: Record<string, unknown>
) {
  const organizationName =
    typeof data.organizationName === "string" ? data.organizationName : "";

  const organization = await createOrganization({
    name: organizationName,
    slug: createSlug(organizationName),
    country: typeof data.country === "string" ? data.country : "",
    timezone: typeof data.timezone === "string" ? data.timezone : "",
  });

  await getProfile(userId);

  return organization;
}