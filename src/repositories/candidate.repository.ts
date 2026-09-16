import { createClient } from "@/lib/supabase/Server";

export interface CreateCandidateInput {
  organization_id: string;
  election_id: string;
  position_id: string;
  user_id?: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  photo_url?: string | null;
  biography?: string | null;
  manifesto?: string | null;
  status?: string;
}

export interface CandidateRecord {
  id: string;
  organization_id: string;
  election_id: string;
  position_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  photo_url: string | null;
  biography: string | null;
  manifesto: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export async function createCandidate(input: CreateCandidateInput): Promise<CandidateRecord> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .insert({
    ...input,
    name: input.display_name,
    position: input.position_id,
    manifesto: input.manifesto ?? null,
    status: input.status ?? "PENDING",
  })
  .select()
  .single();

  if (error) {
    throw error;
  }

  return data as CandidateRecord;
}

export async function getCandidateById(candidateId: string): Promise<CandidateRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CandidateRecord | null) ?? null;
}

export async function listCandidatesForPosition(
  positionId: string,
  options?: { status?: string; search?: string }
): Promise<CandidateRecord[]> {
  const supabase = await createClient();

  let query = supabase.from("candidates").select("*").eq("position_id", positionId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search) {
    query = query.or(
      `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,display_name.ilike.%${options.search}%`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as CandidateRecord[];
}

export async function updateCandidate(
  candidateId: string,
  updates: Partial<CreateCandidateInput> & { status?: string; approved_at?: string | null; approved_by?: string | null }
): Promise<CandidateRecord> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as CandidateRecord;
}

export async function deleteCandidate(candidateId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .delete()
    .eq("id", candidateId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Candidate was not deleted. The candidate may not exist or your account may not have permission to delete it."
    );
  }

  return true;
}

export async function getCandidateSummaryForElection(
  electionId: string,
  organizationId: string
): Promise<Array<{ position_id: string; title: string; total: number; approved: number }>> {
  const supabase = await createClient();

  const { data: positions, error: positionsError } = await supabase
    .from("positions")
    .select("id, title")
    .eq("election_id", electionId)
    .eq("organization_id", organizationId);

  if (positionsError) {
    throw positionsError;
  }

  const result: Array<{ position_id: string; title: string; total: number; approved: number }> = [];

  for (const position of positions ?? []) {
    const { count, error } = await supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("position_id", position.id)
      .eq("organization_id", organizationId)
      .eq("election_id", electionId);

    if (error) {
      throw error;
    }

    const { count: approvedCount, error: approvedError } = await supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("position_id", position.id)
      .eq("organization_id", organizationId)
      .eq("election_id", electionId)
      .eq("status", "APPROVED");

    if (approvedError) {
      throw approvedError;
    }

    result.push({
      position_id: position.id,
      title: position.title,
      total: count ?? 0,
      approved: approvedCount ?? 0,
    });
  }

  return result;
}
