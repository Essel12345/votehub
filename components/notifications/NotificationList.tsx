"use client";

/**
 * NotificationList Component
 * Displays a list of notifications with pagination
 */

import { useState, useEffect } from "react";
import { Notification, NotificationItem } from "./NotificationItem";
import Button from "@/components/ui/Button";

interface NotificationListProps {
  notifications: Notification[];
  loading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
}

export function NotificationList({
  notifications,
  loading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  pagination,
  onPageChange,
}: NotificationListProps) {
  const unreadCount = notifications.filter((n) => n.status !== "READ").length;
  const isFirstPage = pagination?.page === 1;
  const isLastPage = pagination?.page === pagination?.pages;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
            </p>
          )}
        </div>
        {unreadCount > 0 && onMarkAllAsRead && (
          <Button
            onClick={onMarkAllAsRead}
            variant="secondary"
            size="sm"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages} (Total: {pagination.total})
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={isFirstPage || loading}
              variant="secondary"
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={isLastPage || loading}
              variant="secondary"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
