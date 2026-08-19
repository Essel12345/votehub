"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { canTransitionElectionStatus } from "@/lib/validation/election";

const transitions: Record<string, string> = {
  DRAFT: "PUBLISHED",
  PUBLISHED: "OPEN",
  OPEN: "CLOSED",
  CLOSED: "ARCHIVED",
};

const labels: Record<string, string> = {
  DRAFT: "Publish",
  PUBLISHED: "Open",
  OPEN: "Close",
  CLOSED: "Archive",
};

export function ElectionDetailActions({
  electionId,
  status,
}: {
  electionId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = transitions[status];
  const canAdvance = Boolean(nextStatus && canTransitionElectionStatus(status, nextStatus));

  async function handleTransition(next: string) {
    if (!canTransitionElectionStatus(status, next)) {
      setError(`Invalid transition: ${status} -> ${next}`);
      return;
    }

    setPending(next);
    setError(null);

    try {
      const response = await fetch(`/api/elections/${electionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update status.");
      }

      router.refresh();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update status.");
    } finally {
      setPending(null);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this draft election? This action cannot be undone.");
    if (!confirmed) {
      return;
    }

    setPending("delete");
    setError(null);

    try {
      const response = await fetch(`/api/elections/${electionId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete election.");
      }

      router.push("/dashboard/elections");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete election.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-3">
        {canAdvance ? (
          <button
            type="button"
            onClick={() => handleTransition(nextStatus)}
            disabled={pending !== null}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending === nextStatus ? "Updating..." : labels[status] ?? "Advance"}
          </button>
        ) : null}

        {status === "DRAFT" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending !== null}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {pending === "delete" ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
