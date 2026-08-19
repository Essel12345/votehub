-- Create notifications table
-- Stores all in-app and email notifications for users
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS')),
  status VARCHAR(50) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'READ')),
  read_at TIMESTAMP WITH TIME ZONE,
  idempotency_key VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id_created_at
  ON notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON notifications (organization_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications (status);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (type);

CREATE INDEX IF NOT EXISTS idx_notifications_channel
  ON notifications (channel);

CREATE INDEX IF NOT EXISTS idx_notifications_idempotency_key
  ON notifications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Create unique index for idempotency (prevent duplicate notifications)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency_unique
  ON notifications (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status IN ('QUEUED', 'SENT');

-- Create notification_preferences table
-- Stores user preferences for notification channels
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_invitation BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_election_created BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_election_published BOOLEAN NOT NULL DEFAULT FALSE,
  email_on_election_opened BOOLEAN NOT NULL DEFAULT FALSE,
  email_on_election_closing_soon BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_election_closed BOOLEAN NOT NULL DEFAULT FALSE,
  email_on_candidate_approved BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_candidate_rejected BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_ballot_submitted BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_results_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

-- Create index for notification preferences lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON notification_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_organization_id
  ON notification_preferences (organization_id);

-- Update trigger for notification_preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_preferences_update_timestamp ON notification_preferences;
CREATE TRIGGER trg_notification_preferences_update_timestamp
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Update trigger for notifications
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notifications_update_timestamp ON notifications;
CREATE TRIGGER trg_notifications_update_timestamp
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notifications_updated_at();

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own notifications
CREATE POLICY "Notifications: Users can view own notifications" ON notifications
FOR SELECT USING (
  auth.uid() = recipient_id OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- RLS Policy: Service role can insert notifications
CREATE POLICY "Notifications: Service role can insert" ON notifications
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Notifications: Users can update own notifications" ON notifications
FOR UPDATE USING (
  auth.uid() = recipient_id OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Enable RLS on notification_preferences table
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
CREATE POLICY "Notification preferences: Users can view own preferences" ON notification_preferences
FOR SELECT USING (
  auth.uid() = user_id OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Notification preferences: Users can update own preferences" ON notification_preferences
FOR UPDATE USING (
  auth.uid() = user_id OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- RLS Policy: Service role can insert preferences
CREATE POLICY "Notification preferences: Service role can insert" ON notification_preferences
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

COMMENT ON TABLE notifications IS 'Stores all notifications (in-app, email, SMS). Never includes sensitive data like ballot selections or vote choices.';
COMMENT ON TABLE notification_preferences IS 'User notification channel preferences and notification type subscriptions per organization.';
COMMENT ON COLUMN notifications.idempotency_key IS 'Used to prevent duplicate notifications; unique per organization and key.';
COMMENT ON COLUMN notifications.status IS 'QUEUED: waiting to be sent, SENT: successfully delivered, FAILED: delivery failed, READ: user viewed the notification.';
