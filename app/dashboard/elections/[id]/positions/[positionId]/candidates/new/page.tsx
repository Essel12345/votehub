import Link from "next/link";

import CandidateForm from "@/components/candidates/CandidateForm";

export default async function NewCandidatePage({
  params,
}: {
  params: Promise<{ id: string; positionId: string }>;
}) {
  const { id: electionId, positionId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/elections/${electionId}/positions/${positionId}/candidates`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ? Back to candidates
        </Link>

        <p className="mt-4 text-sm font-medium text-blue-600">
          Candidate Registration
        </p>

        <h1 className="text-3xl font-bold text-slate-900">
          Add Candidate
        </h1>

        <p className="mt-1 text-slate-500">
          Add a candidate to this election position.
        </p>
      </div>

      <CandidateForm
        electionId={electionId}
        positionId={positionId}
        mode="create"
      />
    </div>
  );
}
