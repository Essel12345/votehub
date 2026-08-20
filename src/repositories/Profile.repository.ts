import { createClient } from "@/lib/supabase/Server";

export interface ProfileRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  organization_id: string | null;
  role: string;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<ProfileRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProfileRecord | null;
}

export async function getProfilesForOrganization(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}