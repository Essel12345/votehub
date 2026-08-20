/**
 * Notification Preferences Page
 * Allows users to customize notification settings
 */

"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";

interface NotificationPreferences {
  id: string;
  user_id: string;
  organization_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  email_on_invitation: boolean;
  email_on_election_created: boolean;
  email_on_election_published: boolean;
  email_on_election_opened: boolean;
  email_on_election_closing_soon: boolean;
  email_on_election_closed: boolean;
  email_on_candidate_approved: boolean;
  email_on_candidate_rejected: boolean;
  email_on_ballot_submitted: boolean;
  email_on_results_published: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  preferences?: NotificationPreferences;
  success?: boolean;
  error?: string;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/notification-preferences");
        const data: ApiResponse = await response.json();
        if (response.ok && data.preferences) {
          setPreferences(data.preferences);
        } else {
          setError(data.error || "Failed to load preferences");
        }
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
        setError("Failed to load preferences");
      } finally {
        setLoading(false);
      }
    };

    void fetchPreferences();
  }, []);

  async function handlePreferenceChange(
    field: keyof NotificationPreferences,
    value: boolean
  ) {
    if (!preferences) return;

    const updated = { ...preferences, [field]: value };
    setPreferences(updated);

    try {
      setSaving(true);
      const response = await fetch("/api/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save preferences");
        setPreferences(preferences);
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
      setError("Failed to save preferences");
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading preferences...</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-8">
        <p className="text-red-500">Failed to load preferences</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage how you receive notifications from VoteHub
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">✓ Preferences saved</p>
        </div>
      )}

      {/* Channel Preferences */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Notification Channels</h2>
          <p className="text-gray-600 text-sm mt-1">
            Choose how you want to receive notifications
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">In-App Notifications</label>
              <p className="text-sm text-gray-600">
                Receive notifications within VoteHub
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.in_app_enabled}
              onChange={(e) =>
                handlePreferenceChange("in_app_enabled", e.target.checked)
              }
              disabled={saving}
              className="w-5 h-5 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Email Notifications</label>
              <p className="text-sm text-gray-600">
                Receive notifications via email
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={(e) =>
                handlePreferenceChange("email_enabled", e.target.checked)
              }
              disabled={saving}
              className="w-5 h-5 rounded cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Email Notification Types */}
      {preferences.email_enabled && (
        <Card className="mt-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Email Notification Types</h2>
            <p className="text-gray-600 text-sm mt-1">
              Choose which types of notifications you want to receive via email
            </p>
          </div>
          <div className="p-6 space-y-4">
            <PreferenceToggle
              label="Organization Invitations"
              description="When you're invited to join an organization"
              checked={preferences.email_on_invitation}
              onChange={(value) =>
                handlePreferenceChange("email_on_invitation", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Election Created"
              description="When a new election is created in your organization"
              checked={preferences.email_on_election_created}
              onChange={(value) =>
                handlePreferenceChange("email_on_election_created", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Election Published"
              description="When an election is published"
              checked={preferences.email_on_election_published}
              onChange={(value) =>
                handlePreferenceChange("email_on_election_published", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Voting Opened"
              description="When voting opens for an election"
              checked={preferences.email_on_election_opened}
              onChange={(value) =>
                handlePreferenceChange("email_on_election_opened", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Election Closing Soon"
              description="Reminder 24 hours before voting closes"
              checked={preferences.email_on_election_closing_soon}
              onChange={(value) =>
                handlePreferenceChange("email_on_election_closing_soon", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Election Closed"
              description="When voting closes for an election"
              checked={preferences.email_on_election_closed}
              onChange={(value) =>
                handlePreferenceChange("email_on_election_closed", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Candidate Approved"
              description="When your candidacy is approved"
              checked={preferences.email_on_candidate_approved}
              onChange={(value) =>
                handlePreferenceChange("email_on_candidate_approved", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Candidate Rejected"
              description="When your candidacy is rejected"
              checked={preferences.email_on_candidate_rejected}
              onChange={(value) =>
                handlePreferenceChange("email_on_candidate_rejected", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Ballot Submitted"
              description="When your ballot is submitted successfully"
              checked={preferences.email_on_ballot_submitted}
              onChange={(value) =>
                handlePreferenceChange("email_on_ballot_submitted", value)
              }
              disabled={saving}
            />

            <PreferenceToggle
              label="Results Published"
              description="When election results are published"
              checked={preferences.email_on_results_published}
              onChange={(value) =>
                handlePreferenceChange("email_on_results_published", value)
              }
              disabled={saving}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: PreferenceToggleProps) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div>
        <label className="font-medium text-gray-900 block">{label}</label>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-5 h-5 rounded cursor-pointer mt-1 flex-shrink-0"
      />
    </div>
  );
}
