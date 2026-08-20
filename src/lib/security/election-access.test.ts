// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Test mocks intentionally use loose types

import test from "node:test";
import assert from "node:assert/strict";

import {
  createElectionService,
  deleteElectionService,
  getElectionForUser,
} from "@/services/elections/election.service";

type Profile = {
  id: string;
  organization_id: string | null;
  role: string;
};

type Election = {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

test("organization isolation prevents cross-tenant election access", async () => {
  const userId = "user-org-a";

  const profileA: Profile = { id: userId, organization_id: "org-a", role: "ORG_ADMIN" };
  const profileB: Profile = { id: "user-org-b", organization_id: "org-b", role: "ORG_ADMIN" };

  const election: Election = {
    id: "election-1",
    organization_id: "org-a",
    created_by: userId,
    title: "Tenant A election",
    description: "Test",
    status: "DRAFT",
    starts_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2026-01-02T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  const services = {
    getProfile: async (id: string): Promise<Profile | null> => (id === userId ? profileA : profileB),
    getElectionById: async (): Promise<Election | null> => election,
    listElectionsForOrganization: async (): Promise<Election[]> => [election],
    countElectionsForOrganization: async (): Promise<number> => 1,
    createElection: async (input: Record<string, unknown>) => input,
    updateElection: async (id: string, updates: Record<string, unknown>) => ({ id, ...updates }),
    deleteElection: async (id: string) => ({ id }),
  };

  await assert.rejects(
    () => getElectionForUser("user-org-b", "election-1", services),
    /Election not found/
  );
});

test("unauthorized election access is rejected", async () => {
  const profile: Profile = { id: "user-1", organization_id: "org-1", role: "VOTER" };

  await assert.rejects(
    () => createElectionService(
      "user-1",
      {
        title: "test",
        starts_at: "2026-01-01T00:00:00.000Z",
        ends_at: "2026-01-02T00:00:00.000Z",
        status: "DRAFT",
      },
      {
        getProfile: async () => profile,
        getElectionById: async () => null,
        listElectionsForOrganization: async () => [],
        countElectionsForOrganization: async () => 0,
        createElection: async (input: Record<string, unknown>) => input,
        updateElection: async (id: string, updates: Record<string, unknown>) => ({ id, ...updates }),
        deleteElection: async (id: string) => ({ id }),
      }
    ),
    /Only administrators or election officers can create elections/
  );
});

test("delete draft election is allowed for authorized user", async () => {
  const profile: Profile = { id: "user-1", organization_id: "org-1", role: "ORG_ADMIN" };
  const election: Election = {
    id: "election-2",
    organization_id: "org-1",
    created_by: "user-1",
    title: "Draft election",
    description: "Test",
    status: "DRAFT",
    starts_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2026-01-02T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  const result = await deleteElectionService("user-1", "election-2", {
    getProfile: async () => profile,
    getElectionById: async () => election,
    listElectionsForOrganization: async () => [election],
    countElectionsForOrganization: async () => 1,
    createElection: async (input: Record<string, unknown>) => input,
    updateElection: async (id: string, updates: Record<string, unknown>) => ({ id, ...updates }),
    deleteElection: async (id: string) => ({ id, deleted: true }),
  });

  assert.deepEqual(result, { id: "election-2", deleted: true });
});
