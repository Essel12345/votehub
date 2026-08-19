import Link from "next/link";

import { createClient } from "@/lib/supabase/Server";
import { getProfile } from "@/repositories/Profile.repository";
import { getElectionById } from "@/repositories/election.repository";
import { canAccessElectionResults, calculateTurnout } from "@/services/results/results.service";

export default async function ResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Unauthorized.</div>;
  }

  const profile = await getProfile(user.id);
  if (!profile || !profile.organization_id) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">Organization access required.</div>;
  }

  const { data: elections = [] } = await supabase
    .from("elections")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  const rows = await Promise.all(
    (elections as Array<Record<string, unknown>>).map(async (election) => {
      const electionId = String(election.id);
      const resultStatus = String(election.result_status ?? "NOT_READY");
      const isOwner = profile.role === "SUPER_ADMIN" || profile.role === "ORG_ADMIN" || profile.role === "ELECTION_OFFICER";

      if (!canAccessElectionResults(profile.role ?? undefined, resultStatus, isOwner)) {
        return null;
      }

      const { count: ballotsSubmitted = 0 } = await supabase
        .from("ballots")
        .select("id", { count: "exact", head: true })
        .eq("election_id", electionId)
        .eq("status", "SUBMITTED");

      const { count: eligibleVoters = 0 } = await supabase
        .from("election_voters")
        .select("id", { count: "exact", head: true })
        .eq("election_id", electionId);

      const turnout = calculateTurnout(Number(eligibleVoters ?? 0), Number(ballotsSubmitted ?? 0));
      const electionRecord = await getElectionById(electionId);

      return {
        election: electionRecord,
        turnout,
        resultStatus,
      };
    })
  );

  const visibleRows = rows.filter(Boolean) as Array<{ election: Awaited<ReturnType<typeof getElectionById>>; turnout: ReturnType<typeof calculateTurnout>; resultStatus: string }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Election Results</h1>
        <p className="text-slate-500">Review organized results for your organization.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500 md:col-span-2 xl:col-span-3">
            No results are available yet for this organization.
          </div>
        ) : (
          visibleRows.map(({ election, turnout, resultStatus }) => (
            <div key={election?.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{election?.title}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                  {resultStatus}
                </span>
              </div>

              <dl className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <dt>Ballots</dt>
                  <dd>{turnout.participatedVoters}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Turnout</dt>
                  <dd>{turnout.turnoutPercentage}%</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Eligible</dt>
                  <dd>{turnout.eligibleVoters}</dd>
                </div>
              </dl>

              <Link
                href={`/dashboard/elections/${election?.id}/results`}
                className="mt-4 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Open Results
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
