/**
 * Notifications Center Page
 * Full notification management interface
 */

"use client";

import { useEffect, useState } from "react";
import { Notification } from "@/components/notifications/NotificationItem";
import { NotificationList } from "@/components/notifications/NotificationList";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ApiResponse {
  notifications: Notification[];
  pagination: PaginationInfo;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async (page: number) => {
      try {
        setLoading(true);
        const response = await fetch(`/api/notifications?page=${page}&limit=20`);
        const data: ApiResponse = await response.json();
        setNotifications(data.notifications);
        setPagination(data.pagination);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchNotifications(currentPage);
  }, [currentPage]);

  async function handleMarkAsRead(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (response.ok) {
        // Update local state
        setNotifications((notifications) =>
          notifications.map((n) =>
            n.id === notificationId ? { ...n, status: "READ" as const } : n
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (response.ok) {
        // Update local state
        setNotifications((notifications) =>
          notifications.map((n) => ({ ...n, status: "READ" as const }))
        );
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <NotificationList
          notifications={notifications}
          loading={loading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          pagination={pagination || undefined}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
