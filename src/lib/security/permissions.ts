export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ORGANIZATION_ADMIN = "ORGANIZATION_ADMIN",
  ORG_ADMIN = "ORG_ADMIN",
  ELECTION_OFFICER = "ELECTION_OFFICER",
  CANDIDATE = "CANDIDATE",
  VOTER = "VOTER",
}

export function normalizeRole(role: string | null | undefined): string {
  const normalized = String(role ?? "").trim().toUpperCase();

  if (normalized === "ORG_ADMIN") {
    return Role.ORGANIZATION_ADMIN;
  }

  return normalized;
}

export function assertOrganizationAccess(
  currentOrganizationId: string | null | undefined,
  requestedOrganizationId: string | null | undefined
): void {
  if (!currentOrganizationId || !requestedOrganizationId) {
    throw new Error("Organization access denied");
  }

  if (currentOrganizationId !== requestedOrganizationId) {
    throw new Error("Organization access denied");
  }
}

export function canManageOrganization(role: Role | string): boolean {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === Role.SUPER_ADMIN || normalizedRole === Role.ORGANIZATION_ADMIN;
}

export function canManageElection(role: Role | string): boolean {
  const normalizedRole = normalizeRole(role);
  return (
    normalizedRole === Role.SUPER_ADMIN ||
    normalizedRole === Role.ORGANIZATION_ADMIN ||
    normalizedRole === Role.ELECTION_OFFICER
  );
}

export function canAccessOrganizationData(role: Role | string): boolean {
  return normalizeRole(role) !== Role.VOTER || normalizeRole(role) === Role.VOTER;
}

