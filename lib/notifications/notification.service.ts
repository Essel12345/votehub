/**
 * Notification Service
 * Centralized service for sending and managing notifications
 * Supports multiple channels: IN_APP, EMAIL
 */

import { createClient } from "@/lib/supabase/Server";
import { sendEmail } from "@/lib/email/email.service";
import {
  NotificationType,
  getNotificationTemplate,
} from "@/lib/notifications/notification-types";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS";

export interface SendNotificationInput {
  organizationId: string;
  recipientId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  templateVariables: Record<string, string>;
  recipientEmail?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationResult {
  success: boolean;
  notificationIds?: string[];
  errors?: Record<string, string>;
}

/**
 * Send a notification to a user via specified channels
 * Uses idempotency keys to prevent duplicate notifications
 * Email delivery failures do not prevent in-app notification creation
 */
export async function sendNotification(
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  const {
    organizationId,
    recipientId,
    type,
    channels,
    templateVariables,
    recipientEmail,
    idempotencyKey,
    metadata = {},
  } = input;

  const supabase = await createClient();
  const template = getNotificationTemplate(type, templateVariables);
  const notificationIds: string[] = [];
  const errors: Record<string, string> = {};

  try {
    // Process each channel
    for (const channel of channels) {
      try {
        if (channel === "IN_APP") {
          const inAppId = await createInAppNotification(
            supabase,
            organizationId,
            recipientId,
            type,
            template.title,
            template.message,
            idempotencyKey,
            metadata
          );
          notificationIds.push(inAppId);
        } else if (channel === "EMAIL" && recipientEmail) {
          // Send email asynchronously - don't block on failure
          sendEmailNotification(
            recipientEmail,
            type,
            template.title,
            template.htmlTemplate,
            template.textTemplate,
            organizationId,
            recipientId,
            idempotencyKey
          ).catch((error) => {
            console.error("Failed to send email notification:", error);
          });

          // Still log email as queued in database
          const emailNotifId = await createEmailNotification(
            supabase,
            organizationId,
            recipientId,
            type,
            template.title,
            template.message,
            idempotencyKey,
            metadata
          );
          notificationIds.push(emailNotifId);
        } else if (channel === "SMS") {
          // SMS not yet implemented
          errors.SMS = "SMS notifications not yet implemented";
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors[channel] = errorMessage;
        console.error(`Failed to send ${channel} notification:`, error);
      }
    }

    return {
      success: notificationIds.length > 0,
      notificationIds,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Notification send error:", error);
    return {
      success: false,
      errors: { general: errorMessage },
    };
  }
}

/**
 * Create an in-app notification in the database
 * Uses idempotency key to prevent duplicates
 */
async function createInAppNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  idempotencyKey?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  // Check for duplicate if idempotency key is provided
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", idempotencyKey)
      .in("status", ["QUEUED", "SENT"])
      .maybeSingle();

    if (existing) {
      console.log(`Idempotency: Skipping duplicate notification with key: ${idempotencyKey}`);
      return existing.id;
    }
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      organization_id: organizationId,
      recipient_id: recipientId,
      type,
      title,
      message,
      channel: "IN_APP",
      status: "SENT",
      idempotency_key: idempotencyKey,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create in-app notification: ${error.message}`);
  }

  return data.id;
}

/**
 * Create an email notification record in the database
 * Actual email sending happens asynchronously
 */
async function createEmailNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  idempotencyKey?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  // Check for duplicate if idempotency key is provided
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", idempotencyKey)
      .eq("channel", "EMAIL")
      .in("status", ["QUEUED", "SENT"])
      .maybeSingle();

    if (existing) {
      console.log(`Idempotency: Skipping duplicate email notification with key: ${idempotencyKey}`);
      return existing.id;
    }
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      organization_id: organizationId,
      recipient_id: recipientId,
      type,
      title,
      message,
      channel: "EMAIL",
      status: "QUEUED",
      idempotency_key: idempotencyKey,
      metadata: metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create email notification: ${error.message}`);
  }

  return data.id;
}

/**
 * Send email notification asynchronously
 * Updates notification status based on delivery result
 */
async function sendEmailNotification(
  recipientEmail: string,
  type: NotificationType,
  subject: string,
  htmlContent: string,
  textContent: string,
  organizationId: string,
  recipientId: string,
  idempotencyKey?: string
): Promise<void> {
  // Send the email
  const result = await sendEmail({
    to: recipientEmail,
    subject,
    htmlContent,
    textContent,
  });

  if (!result.success) {
    console.error(`Failed to send email for notification type ${type}:`, result.error);
    // Note: We don't throw here - email failures should not break the election flow
    return;
  }

  // Update notification status to SENT
  const supabase = await createClient();
  if (idempotencyKey) {
    const { error } = await supabase
      .from("notifications")
      .update({ status: "SENT" })
      .eq("idempotency_key", idempotencyKey)
      .eq("channel", "EMAIL")
      .eq("organization_id", organizationId);

    if (error) {
      console.error("Failed to update notification status:", error);
    }
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ status: "READ", read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", userId);

  if (error) {
    console.error("Failed to mark notification as read:", error);
    return false;
  }

  return true;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "READ", read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .neq("status", "READ")
    .select("id");

  if (error) {
    console.error("Failed to mark all notifications as read:", error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("status", "QUEUED"); // QUEUED means not yet read (IN_APP), SENT means email was sent

  if (error) {
    console.error("Failed to get unread notification count:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Interface for notification template with subject field
 */
interface NotificationTemplateWithSubject {
  title: string;
  message: string;
  htmlTemplate: string;
  textTemplate: string;
  subject?: string;
}

// Extend the template getter to support subject field
function getNotificationTemplateWithSubject(
  type: NotificationType,
  variables: Record<string, string> = {}
): NotificationTemplateWithSubject {
  const template = getNotificationTemplate(type, variables);
  return {
    ...template,
    subject: template.title,
  };
}
