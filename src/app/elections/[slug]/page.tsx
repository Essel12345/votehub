import Link from "next/link";

import { createClient } from "@/lib/supabase/Server";

export default async function PublicElectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: election, error } = await supabase
    .from("elections")
    .select("*, organizations(name)")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !election) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Election not found</h1>
        <p className="mt-3 text-slate-600">This election may be unpublished or no longer available.</p>
      </main>
    );
  }

  const organizationName = election.organization_id ? "Organization" : "Your Organization";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{organizationName}</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">{election.title}</h1>
        <p className="mt-3 text-slate-600">{election.description ?? "No description provided."}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard label="Status" value={election.status} />
          <InfoCard label="Starts" value={new Date(election.starts_at).toLocaleString()} />
          <InfoCard label="Ends" value={new Date(election.ends_at).toLocaleString()} />
        </div>
      </div>

      {election.instructions ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Instructions</h2>
          <div className="mt-3 whitespace-pre-line text-slate-700">{election.instructions}</div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">This public page is informational only. Voting remains restricted to eligible participants.</p>
        <div className="mt-4">
          <Link href="/" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Back to home</Link>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 font-medium text-slate-900">{value}</p>
    </div>
  );
}
