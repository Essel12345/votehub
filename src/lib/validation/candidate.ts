import { z } from "zod";

export const candidateStatusEnum = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type CandidateStatus = (typeof candidateStatusEnum)[number];

export const candidateCreateSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(80),
  last_name: z.string().trim().min(1, "Last name is required").max(80),
  display_name: z.string().trim().min(1, "Display name is required").max(120),
  photo_url: z.string().max(500).optional().or(z.literal("")),
  biography: z.string().trim().max(2000).optional().or(z.literal("")),
  manifesto: z.string().trim().max(5000).optional().or(z.literal("")),
  status: z.enum(candidateStatusEnum).default("PENDING"),
  user_id: z.string().uuid().nullable().optional(),
});

export const candidateStatusTransitionMap: Record<CandidateStatus, CandidateStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["WITHDRAWN"],
  REJECTED: [],
  WITHDRAWN: [],
};

export function canTransitionCandidateStatus(currentStatus: string, nextStatus: string): boolean {
  if (!(currentStatus in candidateStatusTransitionMap)) {
    return false;
  }

  return candidateStatusTransitionMap[currentStatus as CandidateStatus].includes(nextStatus as CandidateStatus);
}
