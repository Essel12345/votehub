import { createClient } from "@/lib/supabase/Server";

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  timezone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  country: string;
  timezone: string;
  status?: string;
}) {
  const supabase = await createClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .insert({
      ...data,
      status: data.status ?? "ACTIVE",
    })
    .select()
    .single();

  if (error) throw error;

  return organization as OrganizationRecord;
}

export async function getOrganizationById(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as OrganizationRecord | null;
}