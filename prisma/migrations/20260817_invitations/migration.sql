-- Create invitations table
-- Stores organization membership invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  invited_email VARCHAR(255) NOT NULL,
  invited_by_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  token VARCHAR(255) NOT NULL UNIQUE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, invited_email, status)
  WHERE status = 'PENDING'
);

CREATE INDEX IF NOT EXISTS idx_invitations_organization_id
  ON invitations (organization_id);

CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON invitations (invited_email);

CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON invitations (token);

CREATE INDEX IF NOT EXISTS idx_invitations_status
  ON invitations (status);

-- Enable RLS on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Organization admins can view organization's invitations
CREATE POLICY "Invitations: Org admins can view" ON invitations
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.organization_id = invitations.organization_id
    AND ou.user_id = auth.uid()
    AND ou.role IN ('ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER')
  )
);

-- RLS Policy: Service role can insert and update invitations
CREATE POLICY "Invitations: Service role can insert" ON invitations
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Invitations: Service role can update" ON invitations
FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Update trigger for invitations
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invitations_update_timestamp ON invitations;
CREATE TRIGGER trg_invitations_update_timestamp
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_invitations_updated_at();

COMMENT ON TABLE invitations IS 'Stores pending, accepted, and rejected membership invitations.';
COMMENT ON COLUMN invitations.token IS 'Secure random token for invitation acceptance link.';
