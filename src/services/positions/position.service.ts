import { getProfile } from "@/repositories/Profile.repository";
import {
  getPositionById,
  listPositionsForElection,
  type PositionRecord,
} from "@/repositories/position.repository";
import { getElectionById } from "@/repositories/election.repository";
import { canManageElection, Role } from "@/lib/security/permissions";
import { createClient } from "@/lib/supabase/Server";

export type PositionServiceDeps = {
  getProfile: typeof getProfile;
  getPositionById: typeof getPositionById;
  listPositionsForElection: typeof listPositionsForElection;
  getElectionById: typeof getElectionById;
};

const defaultDeps: PositionServiceDeps = {
  getProfile,
  getPositionById,
  listPositionsForElection,
  getElectionById,
};

export async function listPositionsForElectionService(
  userId: string,
  electionId: string,
  deps: Partial<PositionServiceDeps> = {},
): Promise<PositionRecord[]> {
  const service = { ...defaultDeps, ...deps };

  const profile = await service.getProfile(userId);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);

  if (
    !election ||
    election.organization_id !== profile.organization_id
  ) {
    throw new Error("Election not found.");
  }

  return service.listPositionsForElection(electionId);
}

export async function getPositionForUserService(
  userId: string,
  electionId: string,
  positionId: string,
  deps: Partial<PositionServiceDeps> = {},
): Promise<PositionRecord> {
  const service = { ...defaultDeps, ...deps };

  const profile = await service.getProfile(userId);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);
  const position = await service.getPositionById(positionId);

  if (
    !election ||
    election.organization_id !== profile.organization_id
  ) {
    throw new Error("Election not found.");
  }

  if (
    !position ||
    position.organization_id !== profile.organization_id ||
    position.election_id !== electionId
  ) {
    throw new Error("Position not found.");
  }

  return position;
}

export async function createPositionService(
  userId: string,
  electionId: string,
  body: {
    title?: unknown;
    description?: unknown;
  },
  deps: Partial<PositionServiceDeps> = {},
): Promise<PositionRecord> {
  const service = { ...defaultDeps, ...deps };

  const profile = await service.getProfile(userId);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);

  if (
    !election ||
    election.organization_id !== profile.organization_id
  ) {
    throw new Error("Election not found.");
  }

  const role = String(profile.role || "VOTER");

  if (!canManageElection(role as Role)) {
    throw new Error(
      "Only administrators or election officers can manage positions.",
    );
  }

  const title =
    typeof body.title === "string" ? body.title.trim() : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : null;

  if (!title) {
    throw new Error("Position title is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("positions")
    .insert({
      organization_id: profile.organization_id,
      election_id: electionId,
      title,
      description: description || null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PositionRecord;
}

export async function updatePositionService(
  userId: string,
  electionId: string,
  positionId: string,
  body: {
    title?: unknown;
    description?: unknown;
  },
  deps: Partial<PositionServiceDeps> = {},
): Promise<PositionRecord> {
  const service = { ...defaultDeps, ...deps };

  const profile = await service.getProfile(userId);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);
  const position = await service.getPositionById(positionId);

  if (
    !election ||
    election.organization_id !== profile.organization_id
  ) {
    throw new Error("Election not found.");
  }

  if (
    !position ||
    position.organization_id !== profile.organization_id ||
    position.election_id !== electionId
  ) {
    throw new Error("Position not found.");
  }

  const role = String(profile.role || "VOTER");

  if (!canManageElection(role as Role)) {
    throw new Error(
      "Only administrators or election officers can manage positions.",
    );
  }

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : position.title;

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : position.description;

  if (!title) {
    throw new Error("Position title is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("positions")
    .update({
      title,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", positionId)
    .eq("election_id", electionId)
    .eq("organization_id", profile.organization_id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PositionRecord;
}

export async function deletePositionService(
  userId: string,
  electionId: string,
  positionId: string,
  deps: Partial<PositionServiceDeps> = {},
): Promise<void> {
  const service = { ...defaultDeps, ...deps };

  const profile = await service.getProfile(userId);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);
  const position = await service.getPositionById(positionId);

  if (
    !election ||
    election.organization_id !== profile.organization_id
  ) {
    throw new Error("Election not found.");
  }

  if (
    !position ||
    position.organization_id !== profile.organization_id ||
    position.election_id !== electionId
  ) {
    throw new Error("Position not found.");
  }

  const role = String(profile.role || "VOTER");

  if (!canManageElection(role as Role)) {
    throw new Error(
      "Only administrators or election officers can manage positions.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("positions")
    .delete()
    .eq("id", positionId)
    .eq("election_id", electionId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    throw error;
  }
}
