import { z } from "zod";

export const electionStatusEnum = [
  "DRAFT",
  "SCHEDULED",
  "OPEN",
  "CLOSED",
  "RESULTS_READY",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export const resultStatusEnum = [
  "NOT_READY",
  "CALCULATING",
  "READY",
  "PUBLISHED",
] as const;

export const electionTypeEnum = [
  "GENERAL_ELECTION",
  "STUDENT_ELECTION",
  "BOARD_ELECTION",
  "ASSOCIATION_ELECTION",
  "CHURCH_ELECTION",
  "CLUB_ELECTION",
  "CORPORATE_ELECTION",
  "CUSTOM",
] as const;

export const resultVisibilityEnum = [
  "PRIVATE",
  "ORGANIZATION_MEMBERS",
  "PUBLIC_AFTER_PUBLISH",
] as const;

export const accessModeEnum = [
  "PRIVATE",
  "ORGANIZATION_ONLY",
  "PUBLIC_INFORMATION",
] as const;

export type ResultStatus = (typeof resultStatusEnum)[number];
export type ElectionStatus = (typeof electionStatusEnum)[number];
export type ElectionType = (typeof electionTypeEnum)[number];
export type ResultVisibility = (typeof resultVisibilityEnum)[number];
export type AccessMode = (typeof accessModeEnum)[number];

export const validElectionStatusTransitions: Record<ElectionStatus, ElectionStatus[]> = {
  DRAFT: ["SCHEDULED", "ARCHIVED"],
  SCHEDULED: ["OPEN", "ARCHIVED"],
  OPEN: ["CLOSED"],
  CLOSED: ["RESULTS_READY"],
  RESULTS_READY: ["PUBLISHED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionElectionStatus(
  currentStatus: string,
  nextStatus: string
): boolean {
  if (!(currentStatus in validElectionStatusTransitions)) {
    return false;
  }

  return validElectionStatusTransitions[currentStatus as ElectionStatus].includes(
    nextStatus as ElectionStatus
  );
}

export function transitionElectionStatus(
  currentStatus: string,
  nextStatus: string
): ElectionStatus {
  if (!canTransitionElectionStatus(currentStatus, nextStatus)) {
    throw new Error(`Invalid election transition: ${currentStatus} -> ${nextStatus}`);
  }

  return nextStatus as ElectionStatus;
}

export const electionCreateSchema = z
  .object({
    title: z.string().trim().min(3, "Election title is required").max(200),
    slug: z.string().trim().min(2, "Election slug is required").max(120).optional(),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    organization_id: z.string().uuid().optional(),
    status: z.enum(electionStatusEnum).default("DRAFT"),
    type: z.enum(electionTypeEnum).default("GENERAL_ELECTION"),
    starts_at: z
      .string()
      .min(1, "Start date is required")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "Start date must be a valid date",
      }),
    ends_at: z
      .string()
      .min(1, "End date is required")
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "End date must be a valid date",
      }),
    timezone: z.string().trim().min(2, "Timezone is required").default("UTC"),
    logo_url: z.string().url().optional().or(z.literal("")),
    banner_url: z.string().url().optional().or(z.literal("")),
    instructions: z.string().trim().max(10000).optional().or(z.literal("")),
    eligibility_rules: z.string().trim().max(5000).optional().or(z.literal("")),
    voting_rules: z.string().trim().max(5000).optional().or(z.literal("")),
    result_visibility: z.enum(resultVisibilityEnum).default("PRIVATE"),
    access_mode: z.enum(accessModeEnum).default("PRIVATE"),
    support_email: z.string().email().optional().or(z.literal("")),
    support_phone: z.string().trim().max(50).optional().or(z.literal("")),
    support_url: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.starts_at);
    const end = new Date(data.ends_at);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }

    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({
        path: ["ends_at"],
        code: z.ZodIssueCode.custom,
        message: "End date must be after the start date",
      });
    }
  });

export const electionSchema = electionCreateSchema;

export type ElectionFormData = z.infer<typeof electionCreateSchema>;

export type ElectionReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  warning?: string;
};

export function validateElectionForPublish(election: Partial<ElectionFormData> & {
  positionsCount?: number;
  approvedCandidatesCount?: number;
  eligibleVotersCount?: number;
  organizationActive?: boolean;
}): {
  valid: boolean;
  score: number;
  checks: ElectionReadinessCheck[];
  warnings: string[];
} {
  const checks: ElectionReadinessCheck[] = [
    { id: "basic", label: "Basic information", ok: Boolean(election.title && election.title.trim().length >= 3) },
    { id: "schedule", label: "Schedule", ok: Boolean(election.starts_at && election.ends_at && new Date(election.starts_at).getTime() < new Date(election.ends_at).getTime()) },
    { id: "positions", label: "Positions", ok: Number(election.positionsCount ?? 0) > 0 },
    { id: "candidates", label: "Candidates", ok: Number(election.approvedCandidatesCount ?? 0) > 0 },
    { id: "voters", label: "Voters", ok: Number(election.eligibleVotersCount ?? 0) > 0 },
    { id: "rules", label: "Voting rules", ok: Boolean(election.voting_rules || election.type) },
    { id: "organization", label: "Organization active", ok: election.organizationActive !== false },
  ];

  const warnings: string[] = [];
  if (!checks[0].ok) warnings.push("Election title is missing or too short.");
  if (!checks[1].ok) warnings.push("The election schedule is incomplete or invalid.");
  if (!checks[2].ok) warnings.push("At least one position is required before publishing.");
  if (!checks[3].ok) warnings.push("Approved candidates are required for a publishable election.");
  if (!checks[4].ok) warnings.push("No eligible voters have been assigned.");
  if (!checks[5].ok) warnings.push("Voting rules are incomplete.");
  if (!checks[6].ok) warnings.push("Organization must be active before publishing.");

  const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100);

  return {
    valid: checks.every((check) => check.ok),
    score,
    checks,
    warnings,
  };
}

export function getDefaultElectionSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "election";
}