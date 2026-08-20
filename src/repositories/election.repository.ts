import { createClient } from "@/lib/supabase/Server";

export interface CreateElectionInput {
  organization_id: string;
  created_by: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  status: string;
  type?: string | null;
  starts_at: string;
  ends_at: string;
  timezone?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  instructions?: string | null;
  eligibility_rules?: string | null;
  voting_rules?: string | null;
  result_visibility?: string | null;
  access_mode?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  support_url?: string | null;
}

export interface ElectionRecord {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  slug?: string | null;
  description: string | null;
  status: string;
  type?: string | null;
  result_status?: string;
  winner_rule?: string | null;
  published_at?: string | null;
  starts_at: string;
  ends_at: string;
  timezone?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  instructions?: string | null;
  eligibility_rules?: string | null;
  voting_rules?: string | null;
  result_visibility?: string | null;
  access_mode?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  support_url?: string | null;
  created_at: string;
  updated_at: string;
}

export async function createElection(input: CreateElectionInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("elections")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ElectionRecord;
}

export async function getElectionById(electionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("elections")
    .select("*")
    .eq("id", electionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ElectionRecord | null;
}

export async function listElectionsForOrganization(
  organizationId: string,
  options?: { search?: string; status?: string; page?: number; pageSize?: number }
) {
  const supabase = await createClient();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? 10);

  let query = supabase.from("elections").select("*").eq("organization_id", organizationId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) {
    throw error;
  }

  return (data ?? []) as ElectionRecord[];
}

export async function countElectionsForOrganization(
  organizationId: string,
  options?: { search?: string; status?: string }
) {
  const supabase = await createClient();
  let query = supabase
    .from("elections")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function updateElection(electionId: string, updates: Partial<CreateElectionInput>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("elections")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", electionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ElectionRecord;
}

export async function deleteElection(electionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("elections").delete().eq("id", electionId);

  if (error) {
    throw error;
  }

  return true;
}