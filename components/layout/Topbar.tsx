"use client";

import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-8">

      <div>
        <input
          placeholder="Search..."
          className="w-80 rounded-lg border px-4 py-2"
        />
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell unreadCount={0} />

        <div className="text-right">
          <p className="font-semibold">Organization Admin</p>
          <p className="text-sm text-gray-500">
            admin@votehub.com
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
          A
        </div>
      </div>

    </header>
  );
}