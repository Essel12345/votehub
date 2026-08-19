/**
 * User Detail Page
 * Shows user info, roles, organization, and actions
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlertCircle, Mail, Shield, Building2, Clock } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  status: string;
}

interface RoleChange {
  id: string;
  old_role: string;
  new_role: string;
  changed_by_id: string;
  reason: string;
  created_at: string;
}

interface UserDetails {
  profile: Profile;
  organization: Organization | null;
  roleHistory: RoleChange[];
  recentActivity: unknown[];
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch user");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId, router]);

  const handleChangeRole = async () => {
    if (!newRole) {
      alert("Please select a role");
      return;
    }

    if (!roleReason.trim()) {
      alert("Please provide a reason");
      return;
    }

    if (newRole === "ORGANIZATION_ADMIN" && !organizationId) {
      alert("Organization is required for ORGANIZATION_ADMIN role");
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newRole,
          reason: roleReason,
          organizationId: newRole === "ORGANIZATION_ADMIN" ? organizationId : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to change role");

      setChangeRoleOpen(false);
      setNewRole("");
      setRoleReason("");
      setOrganizationId("");

      // Refresh data
      const refreshResponse = await fetch(`/api/admin/users/${userId}`);
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
              <p className="text-red-700">{error || "Failed to load user"}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const profile = data.profile;

  return (
    <AdminLayout>
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-700 mb-4"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{profile.full_name}</h1>
        <p className="text-gray-600 mt-2">{profile.email}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 mb-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* User Info Cards */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {profile.email}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Current Role</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {profile.role}
              </p>
            </div>
          </div>
        </Card>
        {data.organization && (
          <Card>
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Organization</p>
                <p className="text-base font-medium text-gray-900 mt-1">
                  {data.organization.name}
                </p>
              </div>
            </div>
          </Card>
        )}
        <Card>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-sm text-gray-600">Joined</p>
              <p className="text-base font-medium text-gray-900 mt-1">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mb-6">
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => setChangeRoleOpen(true)}
          >
            Change Role
          </Button>
          <Button variant="secondary">Reset Password</Button>
        </div>
      </Card>

      {/* Change Role Dialog */}
      {changeRoleOpen && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <h3 className="font-bold text-blue-900 mb-4">Change User Role</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select role...</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ORGANIZATION_ADMIN">Organization Admin</option>
                <option value="ELECTION_OFFICER">Election Officer</option>
                <option value="CANDIDATE">Candidate</option>
                <option value="VOTER">Voter</option>
              </select>
            </div>

            {newRole === "ORGANIZATION_ADMIN" && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  placeholder="Organization ID"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Reason
              </label>
              <textarea
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                placeholder="Reason for role change..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setChangeRoleOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleChangeRole}>
                Confirm Change
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Role History */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Role Change History</h2>
        {data.roleHistory.length === 0 ? (
          <p className="text-gray-500">No role changes</p>
        ) : (
          <div className="space-y-3">
            {data.roleHistory.map((change) => (
              <div
                key={change.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {change.old_role} → {change.new_role}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{change.reason}</p>
                  </div>
                  <p className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(change.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>
        {data.recentActivity.length === 0 ? (
          <p className="text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {data.recentActivity.map((activity: unknown) => {
              const act = activity as Record<string, unknown>;
              return (
              <div
                key={act.id as string}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{act.action as string}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {act.entity_type as string}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(act.created_at as string).toLocaleString()}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
