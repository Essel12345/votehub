import {
  LayoutDashboard,
  Vote,
  Users,
  UserCheck,
  BarChart3,
  Shield,
  ShieldCheck,
  Settings,
  Bell,
} from "lucide-react";

import NavItem from "./Navitem";

export default function Sidebar() {
  return (
    <aside className="w-72 border-r bg-white p-6">

      <h1 className="mb-8 text-3xl font-bold text-blue-600">
        VoteHub
      </h1>

      <nav className="space-y-2">

        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
        />

        <NavItem
          href="/dashboard/elections"
          icon={<Vote size={20} />}
          label="Elections"
        />

        <NavItem
          href="/dashboard/candidates"
          icon={<Users size={20} />}
          label="Candidates"
        />

        <NavItem
          href="/dashboard/voters"
          icon={<UserCheck size={20} />}
          label="Voters"
        />

        <NavItem
          href="/dashboard/results"
          icon={<BarChart3 size={20} />}
          label="Results"
        />

        <NavItem
          href="/notifications"
          icon={<Bell size={20} />}
          label="Notifications"
        />

        <NavItem
          href="/dashboard/audit-logs"
          icon={<Shield size={20} />}
          label="Audit Logs"
        />

        <NavItem
          href="/dashboard/security"
          icon={<ShieldCheck size={20} />}
          label="Security"
        />

        <NavItem
          href="/dashboard/settings"
          icon={<Settings size={20} />}
          label="Settings"
        />

      </nav>

    </aside>
  );
}