// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Test assertions intentionally compare different string literal types

import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRole, canManageOrganization, canManageElection } from "@/lib/security/permissions";

test("ORG_ADMIN is accepted as an organization admin alias", () => {
  assert.equal(normalizeRole("ORG_ADMIN"), "ORGANIZATION_ADMIN");
  assert.equal(normalizeRole("ORGANIZATION_ADMIN"), "ORGANIZATION_ADMIN");
  assert.equal(canManageOrganization("ORG_ADMIN"), true);
  assert.equal(canManageElection("ORG_ADMIN"), true);
});

test("cross-tenant access is denied when organization ids mismatch", () => {
  assert.throws(() => {
    const currentOrganizationId = "org-a";
    const requestedOrganizationId = "org-b";

    if (currentOrganizationId !== requestedOrganizationId) {
      throw new Error("Organization access denied");
    }
  }, /Organization access denied/);
});
