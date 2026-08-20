/**
 * Admin Dashboard Page
 * 
 * Super Admin dashboard showing platform-wide statistics:
 * - Total organizations (active, suspended, pending)
 * - Total users (by role)
 * - Total elections (by status)
 * - Voting activity
 * - Recent activity
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import StatCard from "@/components/admin/StatCard";
import {
  Building2,
  Users,
  BarChart3,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Stats {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  pendingOrganizations: number;
  totalUsers: number;
  superAdminUsers: number;
  orgAdminUsers: number;
  officerUsers: number;
  candidateUsers: number;
  voterUsers: number;
  totalElections: number;
  draftElections: number;
  publishedElections: number;
  openElections: number;
  closedElections: number;
  totalVoters: number;
  submittedBallots: number;
  avgTurnout: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/dashboard/stats");
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch stats");
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="rounded-lg bg-red-50 p-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error || "Failed to load dashboard"}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-600 mt-2">
          Monitor platform-wide metrics and activity
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Organizations */}
        <StatCard
          title="Total Organizations"
          value={stats.totalOrganizations}
          icon={Building2}
          color="bg-blue-100"
          iconColor="text-blue-600"
          details={[
            { label: "Active", value: stats.activeOrganizations },
            { label: "Suspended", value: stats.suspendedOrganizations },
            { label: "Pending", value: stats.pendingOrganizations },
          ]}
        />

        {/* Users */}
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="bg-purple-100"
          iconColor="text-purple-600"
          details={[
            { label: "Super Admin", value: stats.superAdminUsers },
            { label: "Org Admin", value: stats.orgAdminUsers },
            { label: "Officers", value: stats.officerUsers },
          ]}
        />

        {/* Elections */}
        <StatCard
          title="Total Elections"
          value={stats.totalElections}
          icon={BarChart3}
          color="bg-green-100"
          iconColor="text-green-600"
          details={[
            { label: "Open", value: stats.openElections },
            { label: "Closed", value: stats.closedElections },
            { label: "Draft", value: stats.draftElections },
          ]}
        />

        {/* Voting Activity */}
        <StatCard
          title="Voting Activity"
          value={`${stats.submittedBallots}/${stats.totalVoters}`}
          icon={TrendingUp}
          color="bg-orange-100"
          iconColor="text-orange-600"
          details={[
            { label: "Turnout", value: `${stats.avgTurnout}%` },
            { label: "Voters", value: stats.totalVoters },
            { label: "Ballots", value: stats.submittedBallots },
          ]}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <Button href="/admin/audit-logs" variant="secondary" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-start justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Organization Suspended</p>
                <p className="text-sm text-gray-500">Acme Corp - Suspended due to policy violation</p>
              </div>
              <span className="text-sm text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-start justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">User Role Changed</p>
                <p className="text-sm text-gray-500">john@example.com - Changed to Organization Admin</p>
              </div>
              <span className="text-sm text-gray-400">5 hours ago</span>
            </div>
            <div className="flex items-start justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">New Organization</p>
                <p className="text-sm text-gray-500">Tech Startup Inc - Created and activated</p>
              </div>
              <span className="text-sm text-gray-400">1 day ago</span>
            </div>
          </div>
        </Card>

        {/* Quick Links */}
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Button href="/admin/organizations" className="w-full" variant="secondary">
              Manage Organizations
            </Button>
            <Button href="/admin/users" className="w-full" variant="secondary">
              Manage Users
            </Button>
            <Button href="/admin/security" className="w-full" variant="secondary">
              Security Center
            </Button>
            <Button href="/admin/settings" className="w-full" variant="secondary">
              Platform Settings
            </Button>
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-500">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Auth</p>
              <p className="text-xs text-gray-500">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-xs text-gray-500">Ready</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Storage</p>
              <p className="text-xs text-gray-500">Healthy</p>
            </div>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
