import Link from "next/link";

import { createClient } from "@/lib/supabase/Server";
import { getElectionForUser } from "@/services/elections/election.service";
import ElectionStatusBadge from "@/components/elections/ElectionStatusBadge";
import { ElectionDetailActions } from "@/components/elections/ElectionDetailActions";

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return <div className="text-red-700">Unauthorized.</div>;
  }

  const election = await getElectionForUser(user.id, id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{election.title}</h1>
          <p className="mt-1 text-slate-500">Election details</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/elections"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to elections
          </Link>
          <Link
            href={`/dashboard/elections/${election.id}/edit`}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Edit election
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-slate-500">Current status</span>
          <ElectionStatusBadge status={election.status} />
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Starts</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {new Date(election.starts_at).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Ends</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {new Date(election.ends_at).toLocaleString()}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-500">Description</dt>
            <dd className="mt-1 text-base text-slate-700">{election.description || "No description."}</dd>
          </div>
        </dl>
      </div>

      <ElectionDetailActions electionId={election.id} status={election.status} />
    </div>
  );
}
