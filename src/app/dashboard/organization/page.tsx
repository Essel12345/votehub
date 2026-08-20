import { createClient } from "@/lib/supabase/Server";
import { getCurrentOrganization } from "@/lib/organization/context";

export default async function OrganizationDashboardPage() {
  const { organization, profile } = await getCurrentOrganization();
  const supabase = await createClient();
  const { data: stats } = await supabase
    .from("elections")
    .select("id, status", { count: "exact" })
    .eq("organization_id", organization.id);

  const activeElections = (stats ?? []).filter((election) => election.status === "OPEN").length;
  const upcomingElections = (stats ?? []).filter((election) => election.status === "PUBLISHED").length;
  const closedElections = (stats ?? []).filter((election) => election.status === "CLOSED").length;

  return (
    <main className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Organization profile</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{organization.name}</h1>
          </div>
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
            {organization.status}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active elections" value={String(activeElections)} />
        <StatCard label="Upcoming elections" value={String(upcomingElections)} />
        <StatCard label="Closed elections" value={String(closedElections)} />
        <StatCard label="Role" value={profile.role ?? "MEMBER"} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-6 md:grid-cols-2">
          <div><dt className="text-sm text-slate-500">Type</dt><dd className="mt-1 font-medium">{organization.description ?? "Organization"}</dd></div>
          <div><dt className="text-sm text-slate-500">Country</dt><dd className="mt-1 font-medium">{organization.country ?? "Not set"}</dd></div>
          <div><dt className="text-sm text-slate-500">Timezone</dt><dd className="mt-1 font-medium">{organization.timezone ?? "Not set"}</dd></div>
          <div><dt className="text-sm text-slate-500">Website</dt><dd className="mt-1 font-medium">{organization.website ?? "Not provided"}</dd></div>
          <div className="md:col-span-2"><dt className="text-sm text-slate-500">Contact email</dt><dd className="mt-1 font-medium">{organization.contact_email ?? "Not provided"}</dd></div>
        </dl>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
