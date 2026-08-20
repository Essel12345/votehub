/**
 * Admin Topbar Component
 * 
 * Header for admin pages with:
 * - Page title and breadcrumbs
 * - User info
 * - Quick actions
 */

"use client";

import { Bell, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

interface TopbarProps {
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export default function AdminTopbar({ title, breadcrumbs }: TopbarProps) {
  const userEmail = typeof window !== 'undefined' ? (localStorage.getItem("userEmail") || "Super Admin") : "Super Admin";

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title/Breadcrumbs */}
        <div className="flex items-center gap-4">
          {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <span>/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-gray-900">
                      {crumb.label}
                    </a>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: User Info */}
        <div className="flex items-center gap-6">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Super Admin</p>
              <p className="text-xs text-gray-500">{userEmail}</p>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
