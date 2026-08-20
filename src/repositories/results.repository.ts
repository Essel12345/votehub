import { createClient } from "@/lib/supabase/Server";

export async function getElectionResultContext(electionId: string) {
  const supabase = await createClient();

  const { data: election, error: electionError } = await supabase
    .from("elections")
    .select("*")
    .eq("id", electionId)
    .maybeSingle();

  if (electionError) {
    throw electionError;
  }

  if (!election) {
    return null;
  }

  const [{ data: positions }, { data: eligibleVoters }, { data: submittedBallots }] = await Promise.all([
    supabase.from("positions").select("*").eq("election_id", electionId),
    supabase
      .from("election_voters")
      .select("id", { count: "exact", head: true })
      .eq("election_id", electionId),
    supabase
      .from("ballots")
      .select("id", { count: "exact", head: true })
      .eq("election_id", electionId)
      .eq("status", "SUBMITTED"),
  ]);

  return {
    election,
    positions: positions ?? [],
    eligibleVoters: eligibleVoters ?? 0,
    submittedBallots: submittedBallots ?? 0,
  };
}

export async function getVoteCountsForElection(electionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ballot_selections")
    .select("position_id, candidate_id")
    .neq("candidate_id", null)
    .in(
      "ballot_id",
      (
        await supabase
          .from("ballots")
          .select("id")
          .eq("election_id", electionId)
          .eq("status", "SUBMITTED")
      ).data?.map((ballot) => ballot.id) ?? []
    );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPositionResultsForElection(electionId: string) {
  const supabase = await createClient();

  const { data: positions, error: positionsError } = await supabase
    .from("positions")
    .select("id, title, voting_type, max_choices")
    .eq("election_id", electionId);

  if (positionsError) {
    throw positionsError;
  }

  const result: Record<string, Array<{ candidateId: string; voteCount: number }>> = {};

  for (const position of positions ?? []) {
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("id, display_name")
      .eq("position_id", position.id)
      .eq("status", "APPROVED");

    if (candidatesError) {
      throw candidatesError;
    }

    const { data: selectionData, error: selectionError } = await supabase
      .from("ballot_selections")
      .select("candidate_id")
      .eq("position_id", position.id)
      .neq("candidate_id", null)
      .in(
        "ballot_id",
        (
          await supabase
            .from("ballots")
            .select("id")
            .eq("election_id", electionId)
            .eq("status", "SUBMITTED")
        ).data?.map((ballot) => ballot.id) ?? []
      );

    if (selectionError) {
      throw selectionError;
    }

    const counts = new Map<string, number>();
    for (const entry of selectionData ?? []) {
      if (!entry.candidate_id) continue;
      counts.set(entry.candidate_id, (counts.get(entry.candidate_id) ?? 0) + 1);
    }

    const candidateVotes = (candidates ?? [])
      .filter((candidate) => candidate.id)
      .map((candidate) => ({
        candidateId: candidate.id,
        voteCount: counts.get(candidate.id) ?? 0,
      }));

    result[position.id] = candidateVotes;
  }

  return result;
}

export async function setElectionResultStatus(electionId: string, status: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("elections")
    .update({ result_status: status, updated_at: new Date().toISOString() })
    .eq("id", electionId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveElectionResultSnapshot(electionId: string, payload: Record<string, unknown>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("election_results")
    .upsert({
      election_id: electionId,
      snapshot: payload,
      published_at: payload.published_at ?? null,
      calculated_at: payload.calculated_at ?? new Date().toISOString(),
      status: payload.status ?? "READY",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
