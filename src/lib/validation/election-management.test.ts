import test from "node:test";
import assert from "node:assert/strict";

import {
  canTransitionElectionStatus,
  transitionElectionStatus,
} from "./election";

test("valid state transitions are allowed", () => {
  assert.equal(canTransitionElectionStatus("DRAFT", "SCHEDULED"), true);
  assert.equal(canTransitionElectionStatus("SCHEDULED", "OPEN"), true);
  assert.equal(canTransitionElectionStatus("OPEN", "CLOSED"), true);
  assert.equal(canTransitionElectionStatus("CLOSED", "RESULTS_READY"), true);
  assert.equal(canTransitionElectionStatus("RESULTS_READY", "PUBLISHED"), true);
  assert.equal(canTransitionElectionStatus("PUBLISHED", "ARCHIVED"), true);
});

test("invalid state transitions are rejected", () => {
  assert.equal(canTransitionElectionStatus("DRAFT", "OPEN"), false);
  assert.equal(canTransitionElectionStatus("OPEN", "PUBLISHED"), false);
  assert.equal(canTransitionElectionStatus("ARCHIVED", "OPEN"), false);
  assert.equal(canTransitionElectionStatus("RESULTS_READY", "OPEN"), false);

  assert.throws(() => transitionElectionStatus("DRAFT", "OPEN"), /Invalid election transition/);
});
