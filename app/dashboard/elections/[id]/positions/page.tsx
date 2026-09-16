import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/Server";
import { getElectionById } from "@/repositories/election.repository";
import { listPositionsForElectionService } from "@/services/positions/position.service";

export default async function PositionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: electionId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const election = await getElectionById(electionId);

  if (!election) {
    throw new Error("Election not found.");
  }

  const positions = await listPositionsForElectionService(
    user.id,
    electionId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Election Positions
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            {election.title}
          </h1>

          <p className="mt-1 text-slate-500">
            Manage the positions contestants can run for in this election.
          </p>
        </div>

        <Link
          href={`/dashboard/elections/${electionId}/positions/new`}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add position
        </Link>
      </div>

      {positions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No positions yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create the first position for this election.
          </p>

          <Link
            href={`/dashboard/elections/${electionId}/positions/new`}
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create first position
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {positions.map((position) => (
            <div
              key={position.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {position.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {position.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/elections/${electionId}/positions/${position.id}/candidates`}
                  className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  Candidates
                </Link>

                <Link
                  href={`/dashboard/elections/${electionId}/positions/${position.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
