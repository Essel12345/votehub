/**
 * Organizations Management Page
 * Lists all organizations with status, member count, and actions
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlertCircle, Search } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  memberCount: number;
  electionCount: number;
  created_at: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        const response = await fetch(`/api/admin/organizations${query}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch organizations");
        }
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [search, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "SUSPENDED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
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
        <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
        <p className="text-gray-600 mt-2">Manage all organizations on the platform</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 mb-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Search and Actions */}
      <Card className="mb-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button variant="primary">Create Organization</Button>
        </div>
      </Card>

      {/* Organizations Table */}
      <Card>
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No organizations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Members</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Elections</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{org.name}</p>
                      <p className="text-sm text-gray-500">{org.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(org.status)}`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{org.memberCount}</td>
                    <td className="py-3 px-4 text-gray-900">{org.electionCount}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(`/admin/organizations/${org.id}`)}
                      >
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
