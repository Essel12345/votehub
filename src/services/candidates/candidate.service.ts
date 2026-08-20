import { getProfile } from "@/repositories/Profile.repository";
import { getElectionById } from "@/repositories/election.repository";
import { getPositionById } from "@/repositories/position.repository";
import {
  createCandidate,
  deleteCandidate,
  getCandidateById,
  listCandidatesForPosition,
  updateCandidate,
} from "@/repositories/candidate.repository";
import { canManageElection, canManageOrganization, Role } from "@/lib/security/permissions";
import { candidateCreateSchema, canTransitionCandidateStatus } from "@/lib/validation/candidate";
import { logCandidateAudit } from "@/lib/audit/audit.service";
import { sendNotification } from "@/lib/notifications/notification.service";
import { NotificationType } from "@/lib/notifications/notification-types";

export type CandidateServiceDeps = {
  getProfile: typeof getProfile;
  getElectionById: typeof getElectionById;
  getPositionById: typeof getPositionById;
  getCandidateById: typeof getCandidateById;
  listCandidatesForPosition: typeof listCandidatesForPosition;
  createCandidate: typeof createCandidate;
  updateCandidate: typeof updateCandidate;
  deleteCandidate: typeof deleteCandidate;
};

const defaultDeps: CandidateServiceDeps = {
  getProfile,
  getElectionById,
  getPositionById,
  getCandidateById,
  listCandidatesForPosition,
  createCandidate,
  updateCandidate,
  deleteCandidate,
};

export async function createCandidateService(
  userId: string,
  electionId: string,
  positionId: string,
  body: Record<string, unknown>,
  deps: Partial<CandidateServiceDeps> = {}
) {
  const service = { ...defaultDeps, ...deps };

  const profile = await service.getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role) && !canManageOrganization(role as Role)) {
    throw new Error("You do not have permission to manage candidates.");
  }

  const election = await service.getElectionById(electionId);
  if (!election) {
    throw new Error("Election not found.");
  }

  if (election.organization_id !== profile.organization_id) {
    throw new Error("Election does not belong to your organization.");
  }

  const position = await service.getPositionById(positionId);
  if (!position) {
    throw new Error("Position not found.");
  }

  if (position.organization_id !== profile.organization_id || position.election_id !== electionId) {
    throw new Error("Position does not belong to this election or organization.");
  }

  if (election.status === "OPEN") {
    throw new Error("Cannot add candidates to an OPEN election.");
  }

  const parsed = candidateCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Candidate input is invalid.");
  }

  const candidate = await service.createCandidate({
    organization_id: profile.organization_id,
    election_id: electionId,
    position_id: positionId,
    user_id: typeof parsed.data.user_id === "string" ? parsed.data.user_id : null,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    display_name: parsed.data.display_name,
    photo_url: parsed.data.photo_url || null,
    biography: parsed.data.biography || null,
    manifesto: parsed.data.manifesto || null,
    status: "PENDING",
  });

  await logCandidateAudit("candidate.created", { candidateId: candidate.id, organizationId: profile.organization_id });
  return candidate;
}

export async function listCandidatesForPositionService(
  userId: string,
  electionId: string,
  positionId: string,
  options?: { status?: string; search?: string }
) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const election = await getElectionById(electionId);
  if (!election || election.organization_id !== profile.organization_id) {
    throw new Error("Election not found in your organization.");
  }

  const position = await getPositionById(positionId);
  if (!position || position.organization_id !== profile.organization_id || position.election_id !== electionId) {
    throw new Error("Position not found in this election.");
  }

  return await listCandidatesForPosition(positionId, options);
}

export async function getCandidateForUser(userId: string, candidateId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate || candidate.organization_id !== profile.organization_id) {
    throw new Error("Candidate not found.");
  }

  return candidate;
}

export async function updateCandidateService(
  userId: string,
  candidateId: string,
  body: Record<string, unknown>
) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate || candidate.organization_id !== profile.organization_id) {
    throw new Error("Candidate not found.");
  }

  const election = await getElectionById(candidate.election_id);
  if (!election || election.organization_id !== profile.organization_id) {
    throw new Error("Election not found in your organization.");
  }

  const role = String(profile.role || "VOTER");
  const canMutate = canManageElection(role as Role) || (role === "CANDIDATE" && candidate.user_id === userId);
  if (!canMutate) {
    throw new Error("You do not have permission to update this candidate.");
  }

  const parsed = candidateCreateSchema.safeParse({
    first_name: typeof body.first_name === "string" ? body.first_name : candidate.first_name,
    last_name: typeof body.last_name === "string" ? body.last_name : candidate.last_name,
    display_name: typeof body.display_name === "string" ? body.display_name : candidate.display_name,
    photo_url: typeof body.photo_url === "string" ? body.photo_url : candidate.photo_url ?? "",
    biography: typeof body.biography === "string" ? body.biography : candidate.biography ?? "",
    manifesto: typeof body.manifesto === "string" ? body.manifesto : candidate.manifesto ?? "",
    status: typeof body.status === "string" ? body.status : candidate.status,
    user_id: typeof body.user_id === "string" ? body.user_id : candidate.user_id,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Candidate input is invalid.");
  }

  if (election.status === "OPEN") {
    const blockedFields = [
      parsed.data.first_name !== candidate.first_name,
      parsed.data.last_name !== candidate.last_name,
      parsed.data.display_name !== candidate.display_name,
      parsed.data.photo_url !== (candidate.photo_url ?? ""),
      parsed.data.biography !== (candidate.biography ?? ""),
      parsed.data.manifesto !== (candidate.manifesto ?? ""),
    ].some(Boolean);

    if (blockedFields) {
      throw new Error("No candidate changes are allowed after the election is OPEN.");
    }
  }

  const updated = await updateCandidate(candidateId, {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    display_name: parsed.data.display_name,
    photo_url: parsed.data.photo_url || null,
    biography: parsed.data.biography || null,
    manifesto: parsed.data.manifesto || null,
    status: parsed.data.status,
    user_id: parsed.data.user_id ?? null,
  });

  await logCandidateAudit("candidate.updated", { candidateId: candidate.id, updatedBy: userId });
  return updated;
}

export async function approveCandidateService(userId: string, candidateId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate || candidate.organization_id !== profile.organization_id) {
    throw new Error("Candidate not found.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role) || candidate.user_id === userId) {
    throw new Error("You cannot approve your own candidate profile.");
  }

  if (!canTransitionCandidateStatus(candidate.status, "APPROVED")) {
    throw new Error(`Invalid candidate transition: ${candidate.status} -> APPROVED`);
  }

  const updated = await updateCandidate(candidateId, {
    status: "APPROVED",
    approved_at: new Date().toISOString(),
    approved_by: userId,
  });

  // Send notification to candidate
  try {
    if (candidate.user_id) {
      const electionData = await getElectionById(candidate.election_id);
      const positionData = await getPositionById(candidate.position_id);
      const candidateProfile = await getProfile(candidate.user_id);

      if (candidateProfile && electionData && positionData) {
        await sendNotification({
          organizationId: profile.organization_id,
          recipientId: candidate.user_id,
          type: NotificationType.CANDIDATE_APPROVED,
          channels: ["IN_APP", "EMAIL"],
          templateVariables: {
            candidateName: candidate.display_name || "",
            positionTitle: positionData.title || "",
            electionTitle: electionData.title || "",
            candidateLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/candidates/${candidateId}`,
          },
          recipientEmail: candidateProfile.email || "",
          idempotencyKey: `candidate-approved-${candidateId}`,
        }).catch((error) => {
          console.error("Failed to send candidate approved notification:", error);
        });
      }
    }
  } catch (error) {
    console.error("Failed to send candidate approval notification:", error);
    // Don't throw - approval should succeed even if notification fails
  }

  await logCandidateAudit("candidate.approved", { candidateId: candidate.id, approvedBy: userId });
  return updated;
}

export async function rejectCandidateService(userId: string, candidateId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate || candidate.organization_id !== profile.organization_id) {
    throw new Error("Candidate not found.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("You do not have permission to reject candidates.");
  }

  if (!canTransitionCandidateStatus(candidate.status, "REJECTED")) {
    throw new Error(`Invalid candidate transition: ${candidate.status} -> REJECTED`);
  }

  const updated = await updateCandidate(candidateId, {
    status: "REJECTED",
    approved_at: null,
    approved_by: null,
  });

  // Send notification to candidate
  try {
    if (candidate.user_id) {
      const electionData = await getElectionById(candidate.election_id);
      const positionData = await getPositionById(candidate.position_id);
      const candidateProfile = await getProfile(candidate.user_id);

      if (candidateProfile && electionData && positionData) {
        await sendNotification({
          organizationId: profile.organization_id,
          recipientId: candidate.user_id,
          type: NotificationType.CANDIDATE_REJECTED,
          channels: ["IN_APP", "EMAIL"],
          templateVariables: {
            candidateName: candidate.display_name || "",
            positionTitle: positionData.title || "",
            electionTitle: electionData.title || "",
            rejectionReason: "Your candidacy did not meet the requirements.",
            contactLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
          },
          recipientEmail: candidateProfile.email || "",
          idempotencyKey: `candidate-rejected-${candidateId}`,
        }).catch((error) => {
          console.error("Failed to send candidate rejected notification:", error);
        });
      }
    }
  } catch (error) {
    console.error("Failed to send candidate rejection notification:", error);
    // Don't throw - rejection should succeed even if notification fails
  }

  await logCandidateAudit("candidate.rejected", { candidateId: candidate.id, rejectedBy: userId });
  return updated;
}

export async function withdrawCandidateService(userId: string, candidateId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate || candidate.organization_id !== profile.organization_id) {
    throw new Error("Candidate not found.");
  }

  const role = String(profile.role || "VOTER");
  const isAllowed = canManageElection(role as Role) || candidate.user_id === userId;
  if (!isAllowed) {
    throw new Error("You do not have permission to withdraw this candidate.");
  }

  if (!canTransitionCandidateStatus(candidate.status, "WITHDRAWN")) {
    throw new Error(`Invalid candidate transition: ${candidate.status} -> WITHDRAWN`);
  }

  const updated = await updateCandidate(candidateId, {
    status: "WITHDRAWN",
  });

  await logCandidateAudit("candidate.withdrawn", { candidateId: candidate.id, withdrawnBy: userId });
  return updated;
}

export async function deleteCandidateService(userId: string, candidateId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const candidate = await getCandidateById(candidateId);
  if (!candidate || candidate.organization_id !== profile.organization_id) {
    throw new Error("Candidate not found.");
  }

  const election = await getElectionById(candidate.election_id);
  if (!election || election.organization_id !== profile.organization_id) {
    throw new Error("Election not found.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("You do not have permission to delete candidates.");
  }

  if (election.status === "OPEN") {
    throw new Error("Cannot delete candidates from an OPEN election.");
  }

  const deleted = await deleteCandidate(candidateId);
  await logCandidateAudit("candidate.deleted", { candidateId: candidate.id, deletedBy: userId });
  return deleted;
}
