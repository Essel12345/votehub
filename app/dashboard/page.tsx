import DashboardStats from "@/components/dashboards/DashboardStats";
import RecentElection from "@/components/dashboards/RecentElection";
import QuickActions from "@/components/dashboards/QuickActions";

export default function DashboardPage() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
				<p className="text-gray-500">Welcome back.</p>
			</div>

			<DashboardStats />

			<div className="grid gap-6 xl:grid-cols-3">
				<div className="xl:col-span-2">
					<RecentElection />
				</div>

				<QuickActions />
			</div>
		</div>
	);
}