/**
 * Scheduled Notifications Service
 * Handles background notification jobs (e.g., election closing reminders)
 * 
 * In production, these functions should be called by a cron scheduler or job queue
 * Examples: node-cron, Bull, AWS Lambda, Firebase Cloud Functions, etc.
 */

import { createClient } from "@/lib/supabase/Server";
import { sendNotification } from "@/lib/notifications/notification.service";
import { NotificationType } from "@/lib/notifications/notification-types";
import { getProfile } from "@/repositories/Profile.repository";

/**
 * Send election closing reminders
 * Called 24 hours before election end time
 * Uses idempotency to prevent duplicate sends
 */
export async function sendElectionClosingReminders(): Promise<{
  success: boolean;
  processed: number;
  errors: number;
}> {
  const supabase = await createClient();
  let processed = 0;
  let errors = 0;

  try {
    // Find elections closing in 24 hours
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: electionsClosingSoon, error } = await supabase
      .from("elections")
      .select("*")
      .eq("status", "ACTIVE")
      .gte("ends_at", now.toISOString())
      .lte("ends_at", in24Hours.toISOString());

    if (error) {
      console.error("Failed to fetch closing elections:", error);
      return { success: false, processed: 0, errors: 1 };
    }

    // Send notifications for each closing election
    for (const election of electionsClosingSoon ?? []) {
      try {
        // Get voters in this election
        const { data: voters, error: votersError } = await supabase
          .from("election_voters")
          .select("voter_id")
          .eq("election_id", election.id)
          .eq("status", "ELIGIBLE");

        if (votersError) {
          console.error(`Failed to fetch voters for election ${election.id}:`, votersError);
          errors++;
          continue;
        }

        const hoursRemaining = Math.round(
          (new Date(election.ends_at).getTime() - now.getTime()) / (60 * 60 * 1000)
        );

        const vars = {
          electionTitle: election.title,
          endDate: new Date(election.ends_at).toLocaleString(),
          hoursRemaining: hoursRemaining.toString(),
          votingLink: `${process.env.NEXT_PUBLIC_APP_URL}/elections/${election.id}/vote`,
        };

        // Send to each voter
        for (const voter of voters ?? []) {
          try {
            const voterProfile = await getProfile(voter.voter_id);
            if (!voterProfile) continue;

            await sendNotification({
              organizationId: election.organization_id,
              recipientId: voter.voter_id,
              type: NotificationType.ELECTION_CLOSING_SOON,
              channels: ["IN_APP", "EMAIL"],
              templateVariables: vars,
              recipientEmail: voterProfile.email || "",
              idempotencyKey: `election-closing-${election.id}-${voter.voter_id}`,
              metadata: {
                election_id: election.id,
                scheduled_reminder: true,
              },
            });

            processed++;
          } catch (error) {
            console.error(`Failed to send reminder to voter ${voter.voter_id}:`, error);
            errors++;
          }
        }
      } catch (error) {
        console.error(`Failed to process election ${election.id}:`, error);
        errors++;
      }
    }

    return { success: true, processed, errors };
  } catch (error) {
    console.error("Failed to send election closing reminders:", error);
    return { success: false, processed: 0, errors: 1 };
  }
}

/**
 * Production Setup Guide
 * 
 * To set up scheduled notifications in production:
 * 
 * 1. Using node-cron (local/VPS deployment):
 *    Install 'node-cron' package and schedule this function to run every 6 hours
 * 
 * 2. Using AWS Lambda + EventBridge:
 *    - Create Lambda function that calls sendElectionClosingReminders()
 *    - Create EventBridge rule to trigger Lambda every 6 hours
 * 
 * 3. Using Firebase Cloud Functions:
 *    Create a pubsub scheduled function to call sendElectionClosingReminders() every 6 hours
 * 
 * 4. Using Vercel Cron Functions:
 *    - Create src/pages/api/cron/closing-reminders.ts
 *    - Configure in vercel.json with cron expression
 */
