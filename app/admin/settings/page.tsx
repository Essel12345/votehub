/**
 * Platform Settings Page
 * Configure platform-wide settings (safe settings only, no secrets)
 */

"use client";

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlertCircle, Save } from "lucide-react";

interface Settings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maxOrganizations: number;
  maxUsersPerOrganization: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    platformName: "VoteHub",
    supportEmail: "support@votehub.io",
    maintenanceMode: false,
    maxOrganizations: 1000,
    maxUsersPerOrganization: 10000,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // In production, save to API
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure platform-wide settings</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 mb-6 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 mb-6 border border-green-200">
          <p className="text-green-700">Settings saved successfully</p>
        </div>
      )}

      {/* General Settings */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">General Settings</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Platform Name
            </label>
            <input
              type="text"
              name="platformName"
              value={settings.platformName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Support Email
            </label>
            <input
              type="email"
              name="supportEmail"
              value={settings.supportEmail}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="maintenance"
              name="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <label htmlFor="maintenance" className="text-sm font-medium text-gray-900">
              Maintenance Mode
            </label>
            <p className="text-sm text-gray-600 ml-auto">
              When enabled, only admins can access the platform
            </p>
          </div>
        </div>
      </Card>

      {/* Limits */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Platform Limits</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Max Organizations
            </label>
            <input
              type="number"
              name="maxOrganizations"
              value={settings.maxOrganizations}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Max Users Per Organization
            </label>
            <input
              type="number"
              name="maxUsersPerOrganization"
              value={settings.maxUsersPerOrganization}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Card>
        <div className="flex justify-end gap-4">
          <Button variant="secondary">Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Card>
    </AdminLayout>
  );
}
