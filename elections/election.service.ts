import {
  createElection,
  getElectionById,
  listElectionsForOrganization,
  countElectionsForOrganization,
  updateElection,
  deleteElection,
} from "@/repositories/election.repository";
import { getProfile } from "@/repositories/Profile.repository";
import { canManageElection, Role } from "@/lib/security/permissions";
import {
  electionCreateSchema,
  transitionElectionStatus,
  canTransitionElectionStatus,
} from "@/lib/validation/election";
import { sendNotification } from "@/lib/notifications/notification.service";
import { NotificationType } from "@/lib/notifications/notification-types";
import { getProfilesForOrganization } from "@/repositories/Profile.repository";

export type ElectionServiceDeps = {
  getProfile: typeof getProfile;
  getElectionById: typeof getElectionById;
  listElectionsForOrganization: typeof listElectionsForOrganization;
  countElectionsForOrganization: typeof countElectionsForOrganization;
  createElection: typeof createElection;
  updateElection: typeof updateElection;
  deleteElection: typeof deleteElection;
};

const defaultDeps: ElectionServiceDeps = {
  getProfile,
  getElectionById,
  listElectionsForOrganization,
  countElectionsForOrganization,
  createElection,
  updateElection,
  deleteElection,
};

export async function createElectionService(
  userId: string,
  body: Record<string, unknown>,
  deps: Partial<ElectionServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };
  const profile = await service.getProfile(userId);

  if (!profile) {
    throw new Error("Profile not found.");
  }

  if (!profile.organization_id) {
    throw new Error("User is not assigned to an organization.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Only administrators or election officers can create elections.");
  }

  const parsed = electionCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Election input is invalid.");
  }

  return await service.createElection({
    organization_id: profile.organization_id,
    created_by: profile.id,
    title: parsed.data.title,
    slug: parsed.data.slug ?? undefined,
    description: parsed.data.description ?? "",
    status: parsed.data.status,
    type: parsed.data.type ?? "GENERAL_ELECTION",
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    ends_at: new Date(parsed.data.ends_at).toISOString(),
    timezone: parsed.data.timezone ?? "UTC",
    logo_url: parsed.data.logo_url ?? null,
    banner_url: parsed.data.banner_url ?? null,
    instructions: parsed.data.instructions ?? "",
    eligibility_rules: parsed.data.eligibility_rules ?? "",
    voting_rules: parsed.data.voting_rules ?? "",
    result_visibility: parsed.data.result_visibility ?? "PRIVATE",
    access_mode: parsed.data.access_mode ?? "PRIVATE",
    support_email: parsed.data.support_email ?? null,
    support_phone: parsed.data.support_phone ?? null,
    support_url: parsed.data.support_url ?? null,
  });
}

export async function listMyElections(
  userId: string,
  options?: { search?: string; status?: string; page?: number; pageSize?: number },
  deps: Partial<ElectionServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };
  const profile = await service.getProfile(userId);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  return await service.listElectionsForOrganization(profile.organization_id, options);
}

export async function countMyElections(
  userId: string,
  options?: { search?: string; status?: string },
  deps: Partial<ElectionServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };
  const profile = await service.getProfile(userId);

  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  return await service.countElectionsForOrganization(profile.organization_id, options);
}

export async function getElectionForUser(
  userId: string,
  electionId: string,
  deps: Partial<ElectionServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };
  const profile = await service.getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);
  if (!election || election.organization_id !== profile.organization_id) {
    throw new Error("Election not found.");
  }

  return election;
}

export async function updateElectionService(
  userId: string,
  electionId: string,
  body: Record<string, unknown>,
  deps: Partial<ElectionServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };
  const profile = await service.getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const current = await service.getElectionById(electionId);
  if (!current || current.organization_id !== profile.organization_id) {
    throw new Error("Election not found.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Forbidden");
  }

  if (current.status !== "DRAFT" && body.status && body.status !== current.status) {
    throw new Error("Only draft elections can be edited in this flow.");
  }

  const payload = {
    title: typeof body.title === "string" ? body.title : current.title,
    slug: typeof body.slug === "string" ? body.slug : current.slug ?? undefined,
    description: typeof body.description === "string" ? body.description : current.description,
    status: typeof body.status === "string" ? body.status : current.status,
    type: typeof body.type === "string" ? body.type : current.type ?? "GENERAL_ELECTION",
    starts_at: typeof body.starts_at === "string" ? body.starts_at : current.starts_at,
    ends_at: typeof body.ends_at === "string" ? body.ends_at : current.ends_at,
    timezone: typeof body.timezone === "string" ? body.timezone : current.timezone ?? "UTC",
    logo_url: typeof body.logo_url === "string" ? body.logo_url : current.logo_url ?? "",
    banner_url: typeof body.banner_url === "string" ? body.banner_url : current.banner_url ?? "",
    instructions: typeof body.instructions === "string" ? body.instructions : current.instructions ?? "",
    eligibility_rules: typeof body.eligibility_rules === "string" ? body.eligibility_rules : current.eligibility_rules ?? "",
    voting_rules: typeof body.voting_rules === "string" ? body.voting_rules : current.voting_rules ?? "",
    result_visibility: typeof body.result_visibility === "string" ? body.result_visibility : current.result_visibility ?? "PRIVATE",
    access_mode: typeof body.access_mode === "string" ? body.access_mode : current.access_mode ?? "PRIVATE",
    support_email: typeof body.support_email === "string" ? body.support_email : current.support_email ?? "",
    support_phone: typeof body.support_phone === "string" ? body.support_phone : current.support_phone ?? "",
    support_url: typeof body.support_url === "string" ? body.support_url : current.support_url ?? "",
  };

  const parsed = electionCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Election input is invalid.");
  }

  return await service.updateElection(electionId, {
    title: parsed.data.title,
    slug: parsed.data.slug ?? undefined,
    description: parsed.data.description ?? "",
    status: parsed.data.status,
    type: parsed.data.type ?? "GENERAL_ELECTION",
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    ends_at: new Date(parsed.data.ends_at).toISOString(),
    timezone: parsed.data.timezone ?? "UTC",
    logo_url: parsed.data.logo_url ?? null,
    banner_url: parsed.data.banner_url ?? null,
    instructions: parsed.data.instructions ?? "",
    eligibility_rules: parsed.data.eligibility_rules ?? "",
    voting_rules: parsed.data.voting_rules ?? "",
    result_visibility: parsed.data.result_visibility ?? "PRIVATE",
    access_mode: parsed.data.access_mode ?? "PRIVATE",
    support_email: parsed.data.support_email ?? null,
    support_phone: parsed.data.support_phone ?? null,
    support_url: parsed.data.support_url ?? null,
  });
}

export async function transitionElectionStatusService(
  userId: string,
  electionId: string,
  nextStatus: string,
  deps: Partial<ElectionServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };
  const profile = await service.getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);
  if (!election || election.organization_id !== profile.organization_id) {
    throw new Error("Election not found.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Forbidden");
  }

  if (!canTransitionElectionStatus(election.status, nextStatus)) {
    throw new Error(`Invalid election transition: ${election.status} -> ${nextStatus}`);
  }

  const status = transitionElectionStatus(election.status, nextStatus);

  const updated = await service.updateElection(electionId, { status });

  // Send notifications based on new status
  try {
    const organizationMembers = await getProfilesForOrganization(profile.organization_id);
    const notificationVars = {
      electionTitle: election.title,
      organizationName: election.organization_id,
      startDate: election.starts_at ? new Date(election.starts_at).toLocaleDateString() : "",
      endDate: election.ends_at ? new Date(election.ends_at).toLocaleDateString() : "",
      status: status,
      electionLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/elections/${electionId}`,
      votingLink: `${process.env.NEXT_PUBLIC_APP_URL}/elections/${electionId}/vote`,
    };

    let notificationType: NotificationType | null = null;
    if (status === "PUBLISHED") {
      notificationType = NotificationType.ELECTION_PUBLISHED;
    } else if (status === "OPEN") {
      notificationType = NotificationType.ELECTION_OPENED;
    } else if (status === "CLOSED") {
      notificationType = NotificationType.ELECTION_CLOSED;
    }

    if (notificationType && organizationMembers.length > 0) {
      // Send to all organization members
      for (const member of organizationMembers) {
        await sendNotification({
          organizationId: profile.organization_id,
          recipientId: member.id,
          type: notificationType,
          channels: ["IN_APP"],
          templateVariables: notificationVars,
          idempotencyKey: `election-status-${electionId}-${status}`,
        }).catch((error) => {
          console.error("Failed to send election notification:", error);
        });
      }
    }
  } catch (error) {
    console.error("Failed to send election status notifications:", error);
    // Don't throw - election transition should succeed even if notifications fail
  }

  return updated;
}

export async function deleteElectionService(
  userId: string,
  electionId: string,
  deps: Partial<ElectionServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };
  const profile = await service.getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await service.getElectionById(electionId);
  if (!election || election.organization_id !== profile.organization_id) {
    throw new Error("Election not found.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role) || election.status !== "DRAFT") {
    throw new Error("Only draft elections can be deleted by authorized administrators.");
  }

  return await service.deleteElection(electionId);
}
