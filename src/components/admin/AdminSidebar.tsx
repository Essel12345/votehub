/**
 * Admin Sidebar Component
 * 
 * Navigation sidebar for Super Admin with sections:
 * - Dashboard
 * - Organizations
 * - Users
 * - Elections
 * - Security
 * - Audit Logs
 * - System Health
 * - Settings
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Shield,
  FileText,
  Server,
  Settings,
  LogOut,
} from "lucide-react";

const navSections = [
  {
    label: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Organizations",
        href: "/admin/organizations",
        icon: Building2,
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
      },
      {
        label: "Elections",
        href: "/admin/elections",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Security & Compliance",
    items: [
      {
        label: "Security Center",
        href: "/admin/security",
        icon: Shield,
      },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: FileText,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "System Health",
        href: "/admin/system-health",
        icon: Server,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo/Branding */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">VoteHub Admin</h1>
        <p className="text-sm text-gray-400 mt-1">Super Admin Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto py-6">
        {navSections.map((section) => (
          <div key={section.label} className="mb-8">
            <div className="px-6 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.label}
              </p>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
