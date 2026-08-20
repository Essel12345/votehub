/**
 * System Health Page
 * Monitor database, auth, email, and other critical services
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface HealthResponse {
  timestamp: string;
  status: "healthy" | "degraded" | "down";
  services: Record<
    string,
    {
      status: string;
      error?: string;
      lastChecked: string;
      [key: string]: unknown;
    }
  >;
  system: {
    version: string;
    environment: string;
    uptime: number;
  };
}

export default function SystemHealthPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/admin/system-health");
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login");
            return;
          }
          if (response.status === 403) {
            router.push("/unauthorized");
            return;
          }
          throw new Error("Failed to fetch health");
        }
        const data = await response.json();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [router]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "up":
      case "configured":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "down":
      case "unconfigured":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "up":
      case "configured":
        return "bg-green-50 border-green-200";
      case "degraded":
        return "bg-yellow-50 border-yellow-200";
      case "down":
      case "unconfigured":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
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

  if (!health) {
    return (
      <AdminLayout>
        <div className="rounded-lg bg-red-50 p-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error || "Failed to load system health"}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
        <p className="text-gray-600 mt-2">Monitor critical platform services</p>
      </div>

      {/* Overall Status */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Overall Status</p>
            <p className="text-3xl font-bold text-gray-900 mt-2 capitalize">
              {health.status}
            </p>
          </div>
          <div>
            {health.status === "healthy" && (
              <CheckCircle className="w-16 h-16 text-green-600" />
            )}
            {health.status === "degraded" && (
              <AlertTriangle className="w-16 h-16 text-yellow-600" />
            )}
            {health.status === "down" && (
              <AlertCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
        </div>
      </Card>

      {/* Services */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Services</h2>
        <div className="space-y-3">
          {Object.entries(health.services).map(([name, service]) => {
            const svc = service as Record<string, unknown>;
            const error = typeof svc.error === 'string' ? svc.error : null;
            const provider = typeof svc.provider === 'string' ? svc.provider : null;
            return (
            <div
              key={name}
              className={`border rounded-lg p-4 flex items-start justify-between ${getStatusColor(svc.status as string)}`}
            >
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(svc.status as string)}
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {name.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    Status: {svc.status as string}
                  </p>
                  {error && (
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  )}
                  {provider && (
                    <p className="text-sm text-gray-600 mt-1">
                      Provider: {provider}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Last checked: {new Date(svc.lastChecked as string).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </Card>

      {/* System Info */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-6">System Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Version</p>
            <p className="text-lg font-medium text-gray-900 mt-1">{health.system.version}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Environment</p>
            <p className="text-lg font-medium text-gray-900 mt-1 capitalize">
              {health.system.environment}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Uptime</p>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {Math.floor(health.system.uptime / 60)} minutes
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Update</p>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {new Date(health.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
