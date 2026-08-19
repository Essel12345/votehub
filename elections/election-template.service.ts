import { getProfile } from "@/repositories/Profile.repository";
import { canManageElection, Role } from "@/lib/security/permissions";
import {
  createElectionTemplate,
  getElectionTemplateById,
  listElectionTemplatesForOrganization,
  updateElectionTemplate,
  deleteElectionTemplate,
} from "@/repositories/election-template.repository";

export async function listTemplatesForUser(userId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Forbidden");
  }

  return listElectionTemplatesForOrganization(profile.organization_id);
}

export async function createTemplateForUser(userId: string, body: Record<string, unknown>) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Forbidden");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const templateData = body.template_data && typeof body.template_data === "object" ? body.template_data as Record<string, unknown> : {};

  if (!name) {
    throw new Error("Template name is required.");
  }

  return createElectionTemplate({
    organization_id: profile.organization_id,
    created_by: profile.id,
    name,
    description: typeof body.description === "string" ? body.description : null,
    slug: typeof body.slug === "string" ? body.slug : null,
    template_data: templateData,
  });
}

export async function updateTemplateForUser(userId: string, templateId: string, body: Record<string, unknown>) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Forbidden");
  }

  const template = await getElectionTemplateById(templateId);
  if (!template || template.organization_id !== profile.organization_id) {
    throw new Error("Template not found.");
  }

  return updateElectionTemplate(templateId, {
    name: typeof body.name === "string" ? body.name : template.name,
    description: typeof body.description === "string" ? body.description : template.description,
    slug: typeof body.slug === "string" ? body.slug : template.slug,
    template_data: body.template_data && typeof body.template_data === "object" ? body.template_data as Record<string, unknown> : template.template_data,
    is_archived: typeof body.is_archived === "boolean" ? body.is_archived : template.is_archived,
  });
}

export async function archiveTemplateForUser(userId: string, templateId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Forbidden");
  }

  const template = await getElectionTemplateById(templateId);
  if (!template || template.organization_id !== profile.organization_id) {
    throw new Error("Template not found.");
  }

  return updateElectionTemplate(templateId, { is_archived: true });
}

export async function deleteTemplateForUser(userId: string, templateId: string) {
  const profile = await getProfile(userId);
  if (!profile || !profile.organization_id) {
    throw new Error("Profile not found or organization missing.");
  }

  const role = String(profile.role || "VOTER");
  if (!canManageElection(role as Role)) {
    throw new Error("Forbidden");
  }

  const template = await getElectionTemplateById(templateId);
  if (!template || template.organization_id !== profile.organization_id) {
    throw new Error("Template not found.");
  }

  return deleteElectionTemplate(templateId);
}
