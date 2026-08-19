/**
 * Security Center Page
 * Monitor security events: failed logins, role changes, org suspensions
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import { AlertCircle } from "lucide-react";

interface SecurityEvent {
  id: string;
  actor_id: string;
  actorName: string;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function SecurityPage() {
  const router = useRouter();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/admin/security/events?limit=100");
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch events");
        }
        const data = await response.json();
        setEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  const getEventSeverity = (action: string): "critical" | "warning" | "info" => {
    if (action.includes("SUSPENDED") || action.includes("ROLE_CHANGED")) return "critical";
    return "warning";
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
        <h1 className="text-3xl font-bold text-gray-900">Security Center</h1>
        <p className="text-gray-600 mt-2">Monitor security events and sensitive operations</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 mb-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Events List */}
      <Card>
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No security events found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const severity = getEventSeverity(event.action);
              const severityColor =
                severity === "critical"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200";

              return (
                <div key={event.id} className={`border rounded-lg p-4 ${severityColor}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{event.action}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Actor: {event.actorName} • {event.entity_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        severity === "critical"
                          ? "bg-red-200 text-red-900"
                          : "bg-yellow-200 text-yellow-900"
                      }`}
                    >
                      {severity.toUpperCase()}
                    </span>
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-blue-600 cursor-pointer">
                        View details
                      </summary>
                      <pre className="mt-2 bg-white p-2 rounded text-xs overflow-auto border">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
