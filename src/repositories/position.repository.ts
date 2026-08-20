import { createClient } from "@/lib/supabase/Server";

export interface PositionRecord {
  id: string;
  organization_id: string;
  election_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPositionById(positionId: string): Promise<PositionRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("id", positionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PositionRecord | null) ?? null;
}

export async function listPositionsForElection(electionId: string): Promise<PositionRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("election_id", electionId)
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PositionRecord[];
}
