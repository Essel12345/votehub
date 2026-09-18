import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/Server";
import { getElectionById } from "@/repositories/election.repository";
import { getPositionForUserService } from "@/services/positions/position.service";

export default async function PositionDetailsPage({
  params,
}: {
  params: Promise<{ electionId: string; positionId: string }>;
}) {
  const { electionId, positionId } = await params;

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

  const position = await getPositionForUserService(
    user.id,
    electionId,
    positionId,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/elections/${electionId}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to election
        </Link>

        <p className="mt-4 text-sm font-medium text-blue-600">
          Election Position
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {position.title}
        </h1>

        <p className="mt-1 text-slate-500">
          {election.title}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Position details
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Position
            </p>
            <p className="mt-1 text-slate-900">
              {position.title}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Description
            </p>
            <p className="mt-1 text-slate-900">
              {position.description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/elections/${electionId}/positions/${positionId}/candidates`}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Manage candidates
          </Link>

          <Link
            href={`/dashboard/elections/${electionId}/positions`}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            All positions
          </Link>
        </div>
      </div>
    </div>
  );
}
