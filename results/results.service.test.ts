import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateTurnout,
  determineWinner,
  calculatePositionResult,
} from "@/services/results/results.service";

test("turnout calculates valid submitted ballots over eligible voters", () => {
  const turnout = calculateTurnout(500, 420);
  assert.equal(turnout.eligibleVoters, 500);
  assert.equal(turnout.participatedVoters, 420);
  assert.equal(turnout.nonParticipatingVoters, 80);
  assert.equal(turnout.turnoutPercentage, 84);
});

test("single-choice positions choose the top candidate and report ties", () => {
  const outcome = determineWinner(
    [
      { id: "a", voteCount: 120 },
      { id: "b", voteCount: 120 },
      { id: "c", voteCount: 50 },
    ],
    "SINGLE_CHOICE",
    "MOST_VOTES"
  );

  assert.equal(outcome.status, "TIE");
  assert.deepEqual(outcome.winnerIds, ["a", "b"]);
});

test("position result calculates vote totals and percentages", () => {
  const result = calculatePositionResult(
    [
      { candidateId: "a", voteCount: 120 },
      { candidateId: "b", voteCount: 95 },
      { candidateId: "c", voteCount: 35 },
    ],
    "SINGLE_CHOICE",
    "MOST_VOTES"
  );

  assert.equal(result.totalVotes, 250);
  assert.equal(result.candidates[0].votePercentage, 48);
  assert.equal(result.candidates[1].votePercentage, 38);
  assert.equal(result.candidates[2].votePercentage, 14);
  assert.equal(result.winnerStatus, "WINNER");
});
