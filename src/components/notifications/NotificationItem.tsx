"use client";

/**
 * NotificationItem Component
 * Displays a single notification
 */

import { ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: "QUEUED" | "SENT" | "READ" | "FAILED";
  channel: "IN_APP" | "EMAIL" | "SMS";
  read_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

const notificationTypeIcons: Record<string, { icon: ReactNode; color: string }> = {
  INVITATION_RECEIVED: { icon: "👋", color: "bg-blue-50" },
  ELECTION_CREATED: { icon: "🗳️", color: "bg-purple-50" },
  ELECTION_PUBLISHED: { icon: "📢", color: "bg-purple-50" },
  ELECTION_OPENED: { icon: "🔓", color: "bg-green-50" },
  ELECTION_CLOSING_SOON: { icon: "⏰", color: "bg-orange-50" },
  ELECTION_CLOSED: { icon: "🔒", color: "bg-red-50" },
  CANDIDATE_SUBMITTED: { icon: "🎯", color: "bg-indigo-50" },
  CANDIDATE_APPROVED: { icon: "✅", color: "bg-green-50" },
  CANDIDATE_REJECTED: { icon: "❌", color: "bg-red-50" },
  CANDIDATE_WITHDRAWN: { icon: "↩️", color: "bg-gray-50" },
  VOTER_ADDED_TO_ELECTION: { icon: "👤", color: "bg-blue-50" },
  BALLOT_SUBMITTED: { icon: "📮", color: "bg-green-50" },
  RESULTS_PUBLISHED: { icon: "📊", color: "bg-purple-50" },
  SECURITY_ALERT: { icon: "🚨", color: "bg-red-50" },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) {
  const isRead = notification.status === "READ";
  const typeConfig = notificationTypeIcons[notification.type] || {
    icon: "📬",
    color: "bg-gray-50",
  };
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <div
      onClick={() => {
        if (!isRead && onMarkAsRead) {
          onMarkAsRead(notification.id);
        }
        onClick?.(notification);
      }}
      className={`
        p-4 border-b cursor-pointer transition-all hover:bg-gray-50
        ${isRead ? "bg-white" : "bg-blue-50 border-l-4 border-l-blue-500"}
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{typeConfig.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {notification.title}
            </h3>
            {!isRead && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span>{timeAgo}</span>
            {notification.channel !== "IN_APP" && (
              <>
                <span>•</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                  {notification.channel}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
