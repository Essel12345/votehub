"use client";

import { useEffect, useState } from "react";

export type OrganizationOption = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
};

export function OrganizationSwitcher() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/organizations/current");
        if (!response.ok) {
          return;
        }

        const details = await response.json();
        setCurrentOrganizationId(details.organization?.id ?? null);
        setOrganizations(details.availableOrganizations ?? []);
      } catch {
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function switchOrganization(nextOrganizationId: string) {
    if (!nextOrganizationId) {
      return;
    }

    const response = await fetch("/api/organizations/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: nextOrganizationId }),
    });

    if (!response.ok) {
      return;
    }

    setCurrentOrganizationId(nextOrganizationId);
    window.location.reload();
  }

  if (loading || organizations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="mb-2 block text-sm font-medium text-slate-700">Current Organization</label>
      <select
        value={currentOrganizationId ?? ""}
        onChange={(event) => void switchOrganization(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
        aria-label="Switch organization"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
    </div>
  );
}
