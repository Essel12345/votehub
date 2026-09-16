import Link from "next/link";
import { redirect } from "next/navigation";

import CandidateForm from "@/components/candidates/CandidateForm";
import { createClient } from "@/lib/supabase/Server";
import { getCandidateForUser } from "@/services/candidates/candidate.service";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{
    id: string;
    positionId: string;
    candidateId: string;
  }>;
}) {
  const {
    id: electionId,
    positionId,
    candidateId,
  } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const candidate = await getCandidateForUser(
    user.id,
    candidateId
  );

  if (
    candidate.election_id !== electionId ||
    candidate.position_id !== positionId
  ) {
    throw new Error("Candidate does not belong to this position.");
  }

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
          Candidate Management
        </p>

        <h1 className="text-3xl font-bold text-slate-900">
          Edit Candidate
        </h1>

        <p className="mt-1 text-slate-500">
          Update this candidate&apos;s profile and manifesto.
        </p>
      </div>

      <CandidateForm
        electionId={electionId}
        positionId={positionId}
        candidateId={candidateId}
        mode="edit"
        defaultValues={{
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          display_name: candidate.display_name,
          photo_url: candidate.photo_url ?? "",
          biography: candidate.biography ?? "",
          manifesto: candidate.manifesto ?? "",
        }}
      />
    </div>
  );
}
