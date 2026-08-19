import { createClient } from "@/lib/supabase/Server";
import { getProfile } from "@/repositories/Profile.repository";

export async function getDashboardStats() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfile(user.id);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const organizationId = profile.organization_id;

  const [
    electionsResult,
    activeResult,
    upcomingResult,
    closedResult,
  ] = await Promise.all([
    supabase
      .from("elections")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),

    supabase
      .from("elections")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "OPEN"),

    supabase
      .from("elections")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "PUBLISHED"),

    supabase
      .from("elections")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "CLOSED"),
  ]);

  return {
    totalElections: electionsResult.count ?? 0,
    activeElections: activeResult.count ?? 0,
    upcomingElections: upcomingResult.count ?? 0,
    closedElections: closedResult.count ?? 0,
    registeredVoters: 0,
    candidates: 0,
  };
}