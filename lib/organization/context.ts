import { createClient } from "@/lib/supabase/Server";
import { normalizeRole } from "@/lib/security/permissions";

export type OrganizationStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type OrganizationContext = {
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    organization_id: string | null;
    role: string | null;
    country: string | null;
    timezone: string | null;
    is_active: boolean | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string | null;
    country: string | null;
    timezone: string | null;
    status: OrganizationStatus | string;
    description: string | null;
    website: string | null;
    contact_email: string | null;
  };
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCurrentOrganization(): Promise<OrganizationContext> {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Unauthorized");
  }

  if (!profile.organization_id) {
    throw new Error("Organization membership required");
  }

  const supabase = await createClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!organization) {
    throw new Error("Organization not found");
  }

  if (organization.status === "SUSPENDED") {
    throw new Error("Organization is suspended");
  }

  if (organization.status === "ARCHIVED") {
    throw new Error("Organization is archived");
  }

  return {
    profile,
    organization,
  };
}

export async function requireOrganizationMembership(requiredRoles?: string | string[]) {
  const context = await getCurrentOrganization();
  const profileRole = normalizeRole(context.profile.role);
  const required = Array.isArray(requiredRoles)
    ? requiredRoles.map((role) => normalizeRole(role))
    : requiredRoles
      ? [normalizeRole(requiredRoles)]
      : [];

  if (required.length > 0 && profileRole !== "SUPER_ADMIN" && !required.includes(profileRole)) {
    throw new Error("Forbidden");
  }

  return context;
}

export async function getUserOrganizationOptions() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return [] as Array<{ id: string; name: string; slug: string | null; status: string }>;
  }

  const supabase = await createClient();
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, name, slug, status")
    .eq("id", profile.organization_id ?? "")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (organizations ?? []) as Array<{ id: string; name: string; slug: string | null; status: string }>;
}
