/**
 * Confirmation Dialog Component
 * Reusable dialog for confirming sensitive actions with reason input
 */

"use client";

import { ReactNode, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  severity?: "info" | "warning" | "danger";
  showReasonField?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  severity = "warning",
  showReasonField = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter reason...",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmationDialogProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const severityColors: Record<string, { bg: string; border: string; icon: string }> = {
    info: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600" },
    warning: { bg: "bg-yellow-50", border: "border-yellow-200", icon: "text-yellow-600" },
    danger: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600" },
  };

  const colors = severityColors[severity];
  const buttonVariant = severity === "danger" ? "danger" : "primary";

  const handleConfirm = () => {
    if (showReasonField && !reason.trim()) {
      alert("Please provide a reason");
      return;
    }
    onConfirm(reason || undefined);
    setReason("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className={`w-full max-w-md ${colors.bg} ${colors.border} border-2`}>
        <div className="flex gap-3 mb-4">
          <AlertCircle className={`w-6 h-6 ${colors.icon} flex-shrink-0`} />
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>

        <p className="text-gray-700 mb-4">{message}</p>

        {children}

        {showReasonField && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {reasonLabel}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}
