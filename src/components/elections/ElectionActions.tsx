"use client";

import { useTransition } from "react";

import { electionStatusEnum, ElectionStatus } from "@/lib/validation/election";

const actionLabels: Record<ElectionStatus, string> = {
  DRAFT: "Schedule",
  SCHEDULED: "Open",
  OPEN: "Close",
  CLOSED: "Prepare results",
  RESULTS_READY: "Publish",
  PUBLISHED: "Archive",
  ARCHIVED: "Archived",
};

const nextStatusMap: Record<ElectionStatus, string> = {
  DRAFT: "SCHEDULED",
  SCHEDULED: "OPEN",
  OPEN: "CLOSED",
  CLOSED: "RESULTS_READY",
  RESULTS_READY: "PUBLISHED",
  PUBLISHED: "ARCHIVED",
  ARCHIVED: "ARCHIVED",
};

export default function ElectionActions({
  status,
  onTransition,
  onDelete,
}: {
  status: string;
  onTransition: (nextStatus: string) => void;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const canAdvance = (electionStatusEnum as readonly string[]).includes(status) && status !== "ARCHIVED";

  return (
    <div className="flex flex-wrap gap-3">
      {canAdvance ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              onTransition(nextStatusMap[status as ElectionStatus] ?? status);
            })
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Updating..." : actionLabels[status as ElectionStatus] ?? "Advance"}
        </button>
      ) : null}

      {status === "DRAFT" ? (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}
