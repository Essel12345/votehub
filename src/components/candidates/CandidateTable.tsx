import Link from "next/link";

import CandidateActions from "@/components/candidates/CandidateActions";
import CandidateStatusBadge from "@/components/candidates/CandidateStatusBadge";

export default function CandidateTable({
  candidates,
  electionId,
  positionId,
}: {
  candidates: Array<{
    id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    photo_url?: string | null;
    status: string;
    created_at: string;
  }>;
  electionId: string;
  positionId: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-sm font-semibold text-slate-700">
              Candidate
            </th>
            <th className="px-4 py-3 text-sm font-semibold text-slate-700">
              Status
            </th>
            <th className="px-4 py-3 text-sm font-semibold text-slate-700">
              Created
            </th>
            <th className="px-4 py-3 text-sm font-semibold text-slate-700">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {candidates.map((candidate) => (
            <tr key={candidate.id} className="align-middle">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      candidate.photo_url ||
                      "https://placehold.co/48x48/edf2f7/475569?text=C"
                    }
                    alt={candidate.display_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />

                  <div>
                    <p className="font-medium text-slate-900">
                      {candidate.display_name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {candidate.first_name} {candidate.last_name}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">
                <CandidateStatusBadge status={candidate.status} />
              </td>

              <td className="px-4 py-3 text-sm text-slate-600">
                {new Date(candidate.created_at).toLocaleDateString()}
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/elections/${electionId}/positions/${positionId}/candidates/${candidate.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </Link>

                  <Link
                    href={`/dashboard/elections/${electionId}/positions/${positionId}/candidates/${candidate.id}/edit`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
