/**
 * Invitations Service
 * Handles user invitations to organizations with notification support
 */

import { createClient } from "@/lib/supabase/Server";
import { sendNotification } from "@/lib/notifications/notification.service";
import { NotificationType } from "@/lib/notifications/notification-types";
import { auditLog } from "@/lib/audit/audit.service";

export interface InvitationRecord {
  id: string;
  organization_id: string;
  invited_email: string;
  invited_by_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  token: string;
  created_at: string;
  updated_at: string;
}

/**
 * Send an invitation to a user to join an organization
 * Sends INVITATION_RECEIVED notification
 */
export async function sendOrganizationInvitation(
  organizationId: string,
  invitedEmail: string,
  invitedByUserId: string,
  organizationName: string
): Promise<InvitationRecord> {
  const supabase = await createClient();
  
  // Generate invitation token
  const token = generateInvitationToken();

  // Create invitation record
  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: organizationId,
      invited_email: invitedEmail,
      invited_by_id: invitedByUserId,
      status: "PENDING",
      token,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`);
  }

  // Send notification
  try {
    await sendNotification({
      organizationId,
      recipientId: invitedByUserId, // Notification owner
      type: NotificationType.INVITATION_RECEIVED,
      channels: ["IN_APP", "EMAIL"],
      templateVariables: {
        organizationName,
        invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation?token=${token}`,
      },
      recipientEmail: invitedEmail,
      idempotencyKey: `invitation-${organizationId}-${invitedEmail}`,
      metadata: {
        invitation_id: invitation.id,
        invited_email: invitedEmail,
      },
    });
  } catch (error) {
    console.error("Failed to send invitation notification:", error);
    // Don't throw - invitation should succeed even if notification fails
  }

  // Audit log
  await auditLog({
    organizationId,
    actorId: invitedByUserId,
    action: "MEMBER_INVITED",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: {
      invited_email: invitedEmail,
      invitation_id: invitation.id,
    },
  });

  return invitation as InvitationRecord;
}

/**
 * Generate a secure random token for invitations
 */
function generateInvitationToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
}
