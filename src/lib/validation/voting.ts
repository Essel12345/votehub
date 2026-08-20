import { z } from "zod";

/**
 * Schema for a single ballot selection
 * Represents one position's candidate choice(s)
 */
export const ballotSelectionSchema = z.object({
  position_id: z.string().uuid("Position ID must be a valid UUID"),
  candidate_id: z.string().uuid("Candidate ID must be a valid UUID").nullable().optional(),
  abstained: z.boolean().optional().default(false),
});

/**
 * Schema for ballot submission
 * Contains all selections for all positions
 */
export const ballotSubmissionSchema = z.object({
  election_id: z.string().uuid("Election ID must be a valid UUID"),
  selections: z
    .array(ballotSelectionSchema)
    .min(1, "At least one selection is required"),
});

/**
 * Schema for getting eligible elections
 */
export const getEligibleElectionsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(50).default(10),
});

/**
 * Schema for election voting details (retrieved by voter)
 */
export const electionVotingDetailsSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["UPCOMING", "OPEN", "CLOSED", "ARCHIVED"]),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  voting_instructions: z.string().nullable(),
});

/**
 * Validation helper: Check if voter exceeded max_choices
 */
export function validateMaxChoices(
  selections: Array<{ position_id: string; candidate_id?: string | null }>,
  positionMaxChoices: Record<string, number>
): {
  valid: boolean;
  errors: Array<{ position_id: string; message: string }>;
} {
  const errors: Array<{ position_id: string; message: string }> = [];

  const selectionsByPosition = new Map<
    string,
    Array<string | null | undefined>
  >();

  selections.forEach((sel) => {
    if (!selectionsByPosition.has(sel.position_id)) {
      selectionsByPosition.set(sel.position_id, []);
    }
    selectionsByPosition.get(sel.position_id)!.push(sel.candidate_id);
  });

  selectionsByPosition.forEach((candidates, positionId) => {
    const maxChoices = positionMaxChoices[positionId] ?? 1;
    const validCandidates = candidates.filter((c) => c); // Filter out nulls (abstentions)

    if (validCandidates.length > maxChoices) {
      errors.push({
        position_id: positionId,
        message: `Selected ${validCandidates.length} candidates but maximum is ${maxChoices}`,
      });
    }

    // Check for duplicate selections for same position
    const uniqueCandidates = new Set(validCandidates);
    if (uniqueCandidates.size !== validCandidates.length) {
      errors.push({
        position_id: positionId,
        message: "Duplicate candidate selections for same position",
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validation helper: Check for required selections
 */
export function validateRequiredPositions(
  selections: Array<{ position_id: string }>,
  requiredPositions: string[]
): {
  valid: boolean;
  missingPositions: string[];
} {
  const selectedPositions = new Set(selections.map((s) => s.position_id));
  const missingPositions = requiredPositions.filter((p) => !selectedPositions.has(p));

  return {
    valid: missingPositions.length === 0,
    missingPositions,
  };
}
