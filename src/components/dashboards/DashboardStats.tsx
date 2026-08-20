import { getDashboardStats } from "@/services/Dashboard/DashboardService";

export default async function DashboardStats() {
  const stats = await getDashboardStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total elections" value={stats.totalElections} />
      <StatCard label="Active elections" value={stats.activeElections} />
      <StatCard label="Upcoming elections" value={stats.upcomingElections} />
      <StatCard label="Closed elections" value={stats.closedElections} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
