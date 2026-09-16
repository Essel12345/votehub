import Link from "next/link";

import { createClient } from "@/lib/supabase/Server";
import { getCandidateForUser } from "@/services/candidates/candidate.service";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{
    id: string;
    positionId: string;
    candidateId: string;
  }>;
}) {
  const { id, positionId, candidateId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-6">Unauthorized</div>;
  }

  const candidate = await getCandidateForUser(user.id, candidateId);

  if (!candidate) {
    return <div className="p-6">Candidate not found.</div>;
  }

  if (
    candidate.election_id !== id ||
    candidate.position_id !== positionId
  ) {
    return (
      <div className="p-6">
        Candidate does not belong to this position.
      </div>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Candidate</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {candidate.display_name}
          </h1>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/elections/${id}/positions/${positionId}/candidates`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Candidates
          </Link>

          <Link
            href={`/dashboard/elections/${id}/positions/${positionId}/candidates/${candidateId}/edit`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit Candidate
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          <img
            src={
              candidate.photo_url ||
              "https://placehold.co/160x160/edf2f7/475569?text=Candidate"
            }
            alt={candidate.display_name}
            className="h-40 w-40 rounded-2xl object-cover"
          />

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Full Name</p>
              <p className="text-lg font-semibold text-slate-900">
                {candidate.display_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Status</p>
              <p className="font-medium text-slate-900">
                {candidate.status}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Biography</p>
              <p className="text-slate-700">
                {candidate.biography || "No biography provided."}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Manifesto</p>
              <p className="text-slate-700">
                {candidate.manifesto || "No manifesto provided."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
