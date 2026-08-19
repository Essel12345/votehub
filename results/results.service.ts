export type WinnerStatus = "WINNER" | "TIE" | "NONE";

export type CandidateVoteSummary = {
  id: string;
  candidateId?: string;
  voteCount: number;
};

export function calculateTurnout(eligibleVoters: number, participatedVoters: number) {
  const safeEligible = Math.max(0, Number.isFinite(eligibleVoters) ? eligibleVoters : 0);
  const safeParticipated = Math.max(0, Number.isFinite(participatedVoters) ? participatedVoters : 0);
  const turnoutPercentage = safeEligible === 0 ? 0 : Math.round((safeParticipated / safeEligible) * 100);

  return {
    eligibleVoters: safeEligible,
    participatedVoters: safeParticipated,
    nonParticipatingVoters: Math.max(0, safeEligible - safeParticipated),
    turnoutPercentage,
  };
}

export function canAccessElectionResults(
  role: string | undefined,
  resultStatus: string | undefined,
  isElectionOwner: boolean
): boolean {
  if (role === "SUPER_ADMIN") {
    return true;
  }

  if (role === "ORG_ADMIN" || role === "ELECTION_OFFICER") {
    return isElectionOwner;
  }

  return resultStatus === "PUBLISHED";
}

export function determineWinner(
  votes: CandidateVoteSummary[],
  votingType: string = "SINGLE_CHOICE",
  winnerRule: string = "MOST_VOTES"
): {
  status: WinnerStatus;
  winnerIds: string[];
  winnerId?: string;
  tie: boolean;
} {
  if (!votes.length) {
    return { status: "NONE", winnerIds: [], tie: false };
  }

  const highest = Math.max(...votes.map((vote) => vote.voteCount));
  const winners = votes
    .filter((vote) => vote.voteCount === highest)
    .map((vote) => vote.id || vote.candidateId || "")
    .filter(Boolean);

  if (!winners.length) {
    return { status: "NONE", winnerIds: [], tie: false };
  }

  if (winners.length > 1) {
    return { status: "TIE", winnerIds: winners, tie: true };
  }

  return {
    status: "WINNER",
    winnerIds: winners,
    winnerId: winners[0],
    tie: false,
  };
}

export function calculatePositionResult(
  candidates: Array<{ candidateId: string; voteCount: number }>,
  votingType: string = "SINGLE_CHOICE",
  winnerRule: string = "MOST_VOTES"
) {
  const sorted = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
  const totalVotes = sorted.reduce((sum, candidate) => sum + candidate.voteCount, 0);

  const candidateRows = sorted.map((candidate, index) => ({
    candidateId: candidate.candidateId,
    voteCount: candidate.voteCount,
    votePercentage: totalVotes === 0 ? 0 : Math.round((candidate.voteCount / totalVotes) * 100),
    rank: index + 1,
  }));

  const winner = determineWinner(
    sorted.map((candidate) => ({
      id: candidate.candidateId,
      candidateId: candidate.candidateId,
      voteCount: candidate.voteCount,
    })),
    votingType,
    winnerRule
  );

  return {
    totalVotes,
    winnerStatus: winner.status === "WINNER" ? "WINNER" : winner.status === "TIE" ? "TIE" : "NO_WINNER",
    winnerIds: winner.winnerIds,
    tied: winner.tie,
    candidates: candidateRows,
  };
}
