import { listMyElections } from "@/services/elections/election.service";
import { createClient } from "@/lib/supabase/Server";

export default async function RecentElection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-sm text-slate-500">No data available.</div>;
  }

  const elections = await listMyElections(user.id);
  const latest = elections.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Recent elections</h2>
      <div className="mt-4 space-y-3">
        {latest.length === 0 ? (
          <p className="text-sm text-slate-500">No elections have been created yet.</p>
        ) : (
          latest.map((election: { id: string; title: string; status: string; starts_at: string }) => (
            <div key={election.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className="font-medium text-slate-900">{election.title}</p>
                <p className="text-sm text-slate-500">{election.status}</p>
              </div>
              <span className="text-sm text-slate-500">{new Date(election.starts_at).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
