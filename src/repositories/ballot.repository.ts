import { createClient } from "@/lib/supabase/Server";

export interface BallotRecord {
  id: string;
  election_id: string;
  election_voter_id: string;
  status: string;
  ballot_reference: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface BallotSelectionRecord {
  id: string;
  ballot_id: string;
  position_id: string;
  candidate_id: string | null;
  abstained: boolean;
  created_at: string;
}

export interface CreateBallotSelectionInput {
  position_id: string;
  candidate_id?: string | null;
  abstained?: boolean;
}

export async function getBallotById(ballotId: string): Promise<BallotRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ballots")
    .select("*")
    .eq("id", ballotId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as BallotRecord | null) ?? null;
}

export async function checkVoterHasVoted(
  electionId: string,
  electionVoterId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("ballots")
    .select("id", { count: "exact", head: true })
    .eq("election_id", electionId)
    .eq("election_voter_id", electionVoterId)
    .eq("status", "SUBMITTED");

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

export async function getBallotSelections(
  ballotId: string
): Promise<BallotSelectionRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ballot_selections")
    .select("*")
    .eq("ballot_id", ballotId);

  if (error) {
    throw error;
  }

  return (data ?? []) as BallotSelectionRecord[];
}

export async function createBallot(
  electionId: string,
  electionVoterId: string,
  ballotReference: string,
  _selections: CreateBallotSelectionInput[]
): Promise<BallotRecord> {
  const supabase = await createClient();

  // This should be called via a server-side RPC function for atomicity
  // But here we provide the basic insert
  const { data, error } = await supabase
    .from("ballots")
    .insert({
      election_id: electionId,
      election_voter_id: electionVoterId,
      ballot_reference: ballotReference,
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as BallotRecord;
}

export async function insertBallotSelections(
  ballotId: string,
  selections: CreateBallotSelectionInput[]
): Promise<BallotSelectionRecord[]> {
  const supabase = await createClient();

  const selectionsData = selections.map((sel) => ({
    ballot_id: ballotId,
    position_id: sel.position_id,
    candidate_id: sel.candidate_id || null,
    abstained: sel.abstained || false,
  }));

  const { data, error } = await supabase
    .from("ballot_selections")
    .insert(selectionsData)
    .select();

  if (error) {
    throw error;
  }

  return (data ?? []) as BallotSelectionRecord[];
}

export async function getBallotAuditEventCount(
  electionId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("ballot_audit_events")
    .select("*", { count: "exact", head: true })
    .eq("election_id", electionId)
    .eq("event_type", "ballot.submitted");

  if (error) {
    throw error;
  }

  return count ?? 0;
}
