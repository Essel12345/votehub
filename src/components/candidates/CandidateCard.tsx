import Link from "next/link";

import CandidateActions from "@/components/candidates/CandidateActions";
import CandidateStatusBadge from "@/components/candidates/CandidateStatusBadge";

export default function CandidateCard({
  candidate,
  electionId,
  positionId,
}: {
  candidate: {
    id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    photo_url?: string | null;
    status: string;
    created_at: string;
  };
  electionId: string;
  positionId: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <img
          src={
            candidate.photo_url ||
            "https://placehold.co/80x80/edf2f7/475569?text=Candidate"
          }
          alt={candidate.display_name}
          className="h-16 w-16 rounded-full object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {candidate.display_name}
              </h3>

              <p className="text-sm text-slate-500">
                {candidate.first_name} {candidate.last_name}
              </p>
            </div>

            <CandidateStatusBadge status={candidate.status} />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Created {new Date(candidate.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/elections/${electionId}/positions/${positionId}/candidates/${candidate.id}`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View
        </Link>

        <Link
          href={`/dashboard/elections/${electionId}/positions/${positionId}/candidates/${candidate.id}/edit`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Edit
        </Link>

        <CandidateActions
          candidateId={candidate.id}
          electionId={electionId}
          positionId={positionId}
          status={candidate.status}
        />
      </div>
    </div>
  );
}
