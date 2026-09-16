"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CandidateActions({
  candidateId,
  electionId,
  positionId,
  status,
}: {
  candidateId: string;
  electionId: string;
  positionId: string;
  status: string;
}) {
  const router = useRouter();

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const normalizedStatus = status.toUpperCase();

  async function handleApprove() {
    setError("");

    if (!window.confirm("Are you sure you want to approve this candidate?")) {
      return;
    }

    setIsApproving(true);

    try {
      const response = await fetch(
        `/api/elections/${electionId}/positions/${positionId}/candidates/${candidateId}/approve`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Unable to approve candidate.");
        return;
      }

      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to approve candidate."
      );
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    setError("");

    if (!window.confirm("Are you sure you want to reject this candidate?")) {
      return;
    }

    setIsRejecting(true);

    try {
      const response = await fetch(
        `/api/elections/${electionId}/positions/${positionId}/candidates/${candidateId}/reject`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Unable to reject candidate.");
        return;
      }

      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reject candidate."
      );
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleWithdraw() {
    setError("");

    if (!window.confirm("Are you sure you want to withdraw this candidate?")) {
      return;
    }

    setIsWithdrawing(true);

    try {
      const response = await fetch(
        `/api/elections/${electionId}/positions/${positionId}/candidates/${candidateId}/withdraw`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Unable to withdraw candidate.");
        return;
      }

      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to withdraw candidate."
      );
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function handleDelete() {
    setError("");

    if (
      !window.confirm(
        "Are you sure you want to permanently delete this candidate?"
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/elections/${electionId}/positions/${positionId}/candidates/${candidateId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Unable to delete candidate.");
        return;
      }

      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete candidate."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const isBusy =
    isApproving ||
    isRejecting ||
    isWithdrawing ||
    isDeleting;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {normalizedStatus === "PENDING" ? (
        <>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isBusy}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApproving ? "Approving..." : "Approve"}
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={isBusy}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRejecting ? "Rejecting..." : "Reject"}
          </button>
        </>
      ) : null}

      {normalizedStatus === "APPROVED" ? (
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={isBusy}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isWithdrawing ? "Withdrawing..." : "Withdraw"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isBusy}
        className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {error ? (
        <p className="w-full text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
