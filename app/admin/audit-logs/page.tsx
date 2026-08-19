/**
 * Audit Logs Page
 * Platform-level audit log viewer with search and filters
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import { AlertCircle } from "lucide-react";

interface AuditLog {
  id: string;
  actor_id: string;
  actorName: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  organizationName: string | null;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = new URLSearchParams();
        if (action) params.append("action", action);
        params.append("limit", "100");

        const response = await fetch(`/api/admin/audit-logs?${params}`);
        if (!response.ok) {
          if (response.status === 401) {
            void router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            void router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch logs");
        }
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [action, router]);

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
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-2">Platform-level audit trail (append-only)</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 mb-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <Card className="mb-6">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="ADMIN_ORGANIZATION_SUSPENDED">Organization Suspended</option>
          <option value="ADMIN_USER_ROLE_CHANGED">User Role Changed</option>
          <option value="ADMIN_DASHBOARD_VIEWED">Dashboard Viewed</option>
        </select>
      </Card>

      {/* Logs Table */}
      <Card>
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Entity</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{log.action}</td>
                    <td className="py-3 px-4 text-gray-900">{log.actorName}</td>
                    <td className="py-3 px-4 text-gray-500">{log.entity_type}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details>
                          <summary className="cursor-pointer text-blue-600">View</summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
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
