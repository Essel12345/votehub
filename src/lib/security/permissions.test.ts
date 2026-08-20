import test from "node:test";
import assert from "node:assert/strict";

import {
  assertOrganizationAccess,
  canManageOrganization,
  canManageElection,
  Role,
} from "./permissions";

test("assertOrganizationAccess rejects cross-tenant access", () => {
  assert.throws(
    () => assertOrganizationAccess("org-1", "org-2"),
    /Organization access denied/
  );
});

test("ORG_ADMIN can manage organization", () => {
  assert.equal(canManageOrganization(Role.ORG_ADMIN), true);
  assert.equal(canManageOrganization(Role.VOTER), false);
});

test("SUPER_ADMIN can manage elections across tenant boundaries", () => {
  assert.equal(canManageElection(Role.SUPER_ADMIN), true);
  assert.equal(canManageElection(Role.ELECTION_OFFICER), true);
  assert.equal(canManageElection(Role.VOTER), false);
});
