/**
 * Elections Management Page
 * View all platform elections with stats and actions
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlertCircle, Search } from "lucide-react";

interface Election {
  id: string;
  title: string;
  organizationName: string;
  status: "DRAFT" | "PUBLISHED" | "OPEN" | "CLOSED";
  start_date: string | null;
  end_date: string | null;
  voterCount: number;
  ballotCount: number;
  created_at: string;
}

export default function ElectionsPage() {
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (statusFilter) params.append("status", statusFilter);

        const response = await fetch(`/api/admin/elections?${params}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch elections");
        }
        const data = await response.json();
        setElections(data.elections || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, [search, statusFilter, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "PUBLISHED":
        return "bg-blue-100 text-blue-800";
      case "OPEN":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Elections</h1>
        <p className="text-gray-600 mt-2">View all elections on the platform</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 mb-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search elections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </Card>

      {/* Elections Table */}
      <Card>
        {elections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No elections found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Title
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Organization
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Voters
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Ballots
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Dates
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {elections.map((election) => (
                  <tr
                    key={election.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {election.title}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {election.organizationName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          election.status
                        )}`}
                      >
                        {election.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {election.voterCount}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {election.ballotCount}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      <div>
                        {election.start_date &&
                          new Date(election.start_date).toLocaleDateString()}
                      </div>
                      <div>
                        {election.end_date &&
                          new Date(election.end_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
