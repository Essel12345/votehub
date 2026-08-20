import test from "node:test";
import assert from "node:assert/strict";

import { electionCreateSchema } from "./election";

test("election validation rejects end date before start date", () => {
  const result = electionCreateSchema.safeParse({
    title: "Spring election",
    description: "Annual vote",
    starts_at: "2026-09-05T12:00:00.000Z",
    ends_at: "2026-09-04T12:00:00.000Z",
    status: "DRAFT",
  });

  assert.equal(result.success, false);
});

test("election validation accepts valid draft election", () => {
  const result = electionCreateSchema.safeParse({
    title: "Spring election",
    description: "Annual vote",
    starts_at: "2026-09-04T12:00:00.000Z",
    ends_at: "2026-09-05T12:00:00.000Z",
    status: "DRAFT",
  });

  assert.equal(result.success, true);
});
