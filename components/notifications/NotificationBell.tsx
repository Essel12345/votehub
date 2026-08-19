"use client";

/**
 * NotificationBell Component
 * Displays notification bell icon with unread count
 * Shown in the dashboard header
 */

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

interface NotificationBellProps {
  unreadCount?: number;
  loading?: boolean;
}

export function NotificationBell({
  unreadCount = 0,
  loading = false,
}: NotificationBellProps) {
  const displayCount = unreadCount;

  return (
    <Link href="/notifications" className="relative inline-flex">
      <button
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
        disabled={loading}
        title={
          displayCount > 0
            ? `${displayCount} unread notification${displayCount === 1 ? "" : "s"}`
            : "Notifications"
        }
      >
        <Bell className="w-5 h-5" />
        {displayCount > 0 && !loading && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {displayCount > 9 ? "9+" : displayCount}
          </span>
        )}
        {loading && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-gray-300 rounded-full animate-pulse" />
        )}
      </button>
    </Link>
  );
}
