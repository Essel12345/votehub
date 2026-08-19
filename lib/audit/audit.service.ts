import type { ProfileRecord } from "@/repositories/Profile.repository";

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_LOGIN_FAILED"
  | "ORGANIZATION_CREATED"
  | "ORGANIZATION_UPDATED"
  | "MEMBER_INVITED"
  | "MEMBER_JOINED"
  | "MEMBER_REMOVED"
  | "ROLE_CHANGED"
  | "ELECTION_CREATED"
  | "ELECTION_UPDATED"
  | "ELECTION_PUBLISHED"
  | "ELECTION_OPENED"
  | "ELECTION_CLOSED"
  | "ELECTION_ARCHIVED"
  | "POSITION_CREATED"
  | "POSITION_UPDATED"
  | "POSITION_DELETED"
  | "CANDIDATE_CREATED"
  | "CANDIDATE_UPDATED"
  | "CANDIDATE_APPROVED"
  | "CANDIDATE_REJECTED"
  | "CANDIDATE_WITHDRAWN"
  | "VOTER_CREATED"
  | "VOTER_UPDATED"
  | "VOTER_IMPORTED"
  | "VOTER_ASSIGNED"
  | "VOTER_REMOVED"
  | "BALLOT_SUBMISSION_ACCEPTED"
  | "BALLOT_SUBMISSION_REJECTED"
  | "RESULTS_CALCULATED"
  | "RESULTS_PUBLISHED"
  | "RESULTS_UNPUBLISHED"
  | "SECURITY_PERMISSION_DENIED";

export type CandidateAuditEvent =
  | "candidate.created"
  | "candidate.updated"
  | "candidate.approved"
  | "candidate.rejected"
  | "candidate.withdrawn"
  | "candidate.deleted";

export type AuditLogInput = {
  action: AuditAction | CandidateAuditEvent;
  organizationId?: string | null;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "secret",
  "authorization",
  "cookie",
  "session",
  "vote_selection",
  "ballot_contents",
  "ballot",
  "voter_identity",
  "candidate_selection",
]);

export function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  const value = metadata ?? {};

  const scrub = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((entry) => scrub(entry));
    }

    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>).map(([key, nestedValue]) => {
          if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            return [key, "[REDACTED]"];
          }

          return [key, scrub(nestedValue)];
        })
      );
    }

    return input;
  };

  return scrub(value) as Record<string, unknown>;
}

export function shouldExposeAuditLogToActor(
  actorRole: string | undefined,
  actorOrganizationId: string | null | undefined,
  logOrganizationId: string | null | undefined
): boolean {
  if (actorRole === "SUPER_ADMIN") {
    return true;
  }

  if (!actorOrganizationId || !logOrganizationId) {
    return false;
  }

  if (actorRole === "ORG_ADMIN" || actorRole === "ELECTION_OFFICER") {
    return actorOrganizationId === logOrganizationId;
  }

  return false;
}

export async function auditLog(input: AuditLogInput) {
  const { createClient } = await import("@/lib/supabase/Server");
  const supabase = await createClient();
  const sanitizedMetadata = sanitizeMetadata(input.metadata);

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      organization_id: input.organizationId ?? null,
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType ?? "unknown",
      entity_id: input.entityId ?? null,
      metadata: sanitizedMetadata,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    })
    .select()
    .single();

  if (error) {
    console.warn("Audit log write failed:", error.message);
    return null;
  }

  return data;
}

export async function logCandidateAudit(event: CandidateAuditEvent, details: Record<string, unknown>) {
  return auditLog({
    action: event.replace("candidate.", "CANDIDATE_").toUpperCase() as AuditAction,
    entityType: "candidate",
    entityId: typeof details.candidateId === "string" ? details.candidateId : null,
    metadata: details,
  });
}

export async function listAuditLogsForOrganization(
  userId: string,
  organizationId: string | null,
  options?: {
    action?: string;
    actorId?: string;
    entityType?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { getProfile } = await import("@/repositories/Profile.repository");
  const profile = (await getProfile(userId)) as ProfileRecord | null;
  if (!profile) {
    throw new Error("Profile not found.");
  }

  const role = String(profile.role ?? "VOTER");
  if (role !== "SUPER_ADMIN" && profile.organization_id !== organizationId) {
    throw new Error("Organization access denied");
  }

  const { createClient } = await import("@/lib/supabase/Server");
  const supabase = await createClient();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (role !== "SUPER_ADMIN") {
    query = query.eq("organization_id", organizationId);
  }

  if (options?.action) {
    query = query.eq("action", options.action);
  }

  if (options?.actorId) {
    query = query.eq("actor_id", options.actorId);
  }

  if (options?.entityType) {
    query = query.eq("entity_type", options.entityType);
  }

  if (options?.from) {
    query = query.gte("created_at", new Date(options.from).toISOString());
  }

  if (options?.to) {
    query = query.lte("created_at", new Date(options.to).toISOString());
  }

  if (options?.search) {
    const term = options.search.trim();
    if (term) {
      query = query.or(`action.ilike.%${term}%,entity_type.ilike.%${term}%`);
    }
  }

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  return {
    logs: data ?? [],
    total: count ?? 0,
  };
}

export async function getAuditLogById(userId: string, auditLogId: string) {
  const { createClient } = await import("@/lib/supabase/Server");
  const supabase = await createClient();
  const { data, error } = await supabase.from("audit_logs").select("*").eq("id", auditLogId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { getProfile } = await import("@/repositories/Profile.repository");
  const profile = (await getProfile(userId)) as ProfileRecord | null;
  if (!profile) {
    throw new Error("Profile not found.");
  }

  const role = String(profile.role ?? "VOTER");
  if (role !== "SUPER_ADMIN" && profile.organization_id !== data.organization_id) {
    throw new Error("Organization access denied");
  }

  return data;
}
