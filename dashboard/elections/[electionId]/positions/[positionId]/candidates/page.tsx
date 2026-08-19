import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/Server";
import CandidateTable from "@/components/candidates/CandidateTable";
import CandidateCard from "@/components/candidates/CandidateCard";
import { listCandidatesForPositionService } from "@/services/candidates/candidate.service";
import { getElectionById } from "@/repositories/election.repository";
import { getPositionById } from "@/repositories/position.repository";

export default async function CandidateListPage({
  params,
  searchParams,
}: {
  params: Promise<{ electionId: string; positionId: string }>;
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  const { electionId, positionId } = await params;
  const query = (await searchParams)?.search ?? "";
  const status = (await searchParams)?.status ?? "";

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/login");
  }

  const election = await getElectionById(electionId);
  const position = await getPositionById(positionId);
  if (!election || !position || election.organization_id !== position.organization_id) {
    throw new Error("Election or position not found.");
  }

  const candidates = await listCandidatesForPositionService(user.id, electionId, positionId, {
    search: query || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Candidates</h1>
          <p className="text-slate-500">{position.title} • {election.title}</p>
        </div>
        <Link
          href={`/dashboard/elections/${electionId}/positions/${positionId}/candidates/new`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add candidate
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No candidates match this position yet.
        </div>
      ) : (
        <div className="space-y-4">
          <CandidateTable candidates={candidates} electionId={electionId} positionId={positionId} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} electionId={electionId} positionId={positionId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
