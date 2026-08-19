/**
 * Organization Detail Page
 * Shows organization info, members, admins, and actions
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlertCircle, Users, Shield, Zap } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface OrgDetails {
  organization: Organization;
  members: Member[];
  memberCount: number;
  electionCount: number;
  admins: Member[];
}

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;

  const [data, setData] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  useEffect(() => {
    const fetchOrgDetails = async () => {
      try {
        const response = await fetch(`/api/admin/organizations/${organizationId}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch organization");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrgDetails();
  }, [organizationId, router]);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      alert("Please provide a reason");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/suspend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: suspendReason }),
        }
      );

      if (!response.ok) throw new Error("Failed to suspend organization");

      setSuspendDialogOpen(false);
      setSuspendReason("");
      // Refresh data
      const refreshResponse = await fetch(
        `/api/admin/organizations/${organizationId}`
      );
      const refreshedData = await refreshResponse.json();
      setData(refreshedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleReactivate = async () => {
    const reason = prompt("Reason for reactivation:");
    if (!reason) return;

    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/reactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) throw new Error("Failed to reactivate organization");

      // Refresh data
      const refreshResponse = await fetch(
        `/api/admin/organizations/${organizationId}`
      );
      const refreshedData = await refreshResponse.json();
      setData(refreshedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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

  if (!data) {
    return (
      <AdminLayout>
        <div className="rounded-lg bg-red-50 p-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">
                {error || "Failed to load organization"}
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const org = data.organization;

  return (
    <AdminLayout>
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-700 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
        <p className="text-gray-600 mt-2">{org.description}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 mb-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-medium text-gray-900 mt-1">{org.status}</p>
          </div>
          <div className="flex gap-3">
            {org.status === "ACTIVE" && (
              <Button
                variant="danger"
                onClick={() => setSuspendDialogOpen(true)}
              >
                Suspend
              </Button>
            )}
            {org.status === "SUSPENDED" && (
              <Button variant="primary" onClick={handleReactivate}>
                Reactivate
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Suspend Dialog */}
      {suspendDialogOpen && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <h3 className="font-bold text-red-900 mb-4">Suspend Organization</h3>
          <p className="text-sm text-red-700 mb-4">
            This will prevent the organization from performing restricted operations.
          </p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Reason for suspension..."
            className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
            rows={3}
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setSuspendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleSuspend}>
              Confirm Suspension
            </Button>
          </div>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.memberCount}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.admins.length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-sm text-gray-600">Elections</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.electionCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Organization Admins */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Admins</h2>
        {data.admins.length === 0 ? (
          <p className="text-gray-500">No admins assigned</p>
        ) : (
          <div className="space-y-3">
            {data.admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{admin.full_name}</p>
                  <p className="text-sm text-gray-500">{admin.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Members */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-6">Members</h2>
        {data.members.length === 0 ? (
          <p className="text-gray-500">No members</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-900">{member.email}</td>
                    <td className="py-3 px-4 text-gray-900">
                      {member.full_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {member.role}
                      </span>
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
