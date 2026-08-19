-- Add status column to organizations table
-- Tracks organization state: ACTIVE (normal), PENDING (awaiting setup), SUSPENDED (no elections/voters)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED'));

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Add comment about organization status
COMMENT ON COLUMN organizations.status IS 
'ACTIVE: Normal operations allowed
PENDING: Organization awaiting setup, no elections yet
SUSPENDED: No new elections, voters, or admin changes allowed - historical data preserved';

-- Create organization_suspension_audit table to track suspension history
CREATE TABLE IF NOT EXISTS organization_suspension_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  suspended_by_id UUID,
  suspension_reason TEXT,
  resumed_by_id UUID,
  resumption_reason TEXT,
  suspended_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_suspension_audit_org_id 
  ON organization_suspension_audit(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_suspension_audit_suspended_at 
  ON organization_suspension_audit(suspended_at DESC);

COMMENT ON TABLE organization_suspension_audit IS 
'Append-only audit trail of organization suspensions and resumptions with reasons';

-- Ensure profiles table has role column with proper values
-- Note: profiles table should have: id, email, full_name, organization_id, role, country, timezone, is_active, created_at, updated_at
-- If profiles table doesn't exist, create it
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  organization_id UUID,
  role VARCHAR(50) NOT NULL DEFAULT 'VOTER' 
    CHECK (role IN ('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'ELECTION_OFFICER', 'CANDIDATE', 'VOTER')),
  country VARCHAR(255),
  timezone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_profiles_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);

-- If profiles table already exists, just add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'VOTER' 
  CHECK (role IN ('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'ELECTION_OFFICER', 'CANDIDATE', 'VOTER'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Create indexes on profiles for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Org admins can view org members" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Org admins can update org members" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;

-- RLS Policies for profiles

-- SELECT policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Org admins can view org members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
      AND admin.role IN ('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
      AND (admin.organization_id = profiles.organization_id OR admin.role = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles sa
      WHERE sa.id = auth.uid() AND sa.role = 'SUPER_ADMIN'
    )
  );

-- UPDATE policies
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles sa
      WHERE sa.id = auth.uid() AND sa.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles sa
      WHERE sa.id = auth.uid() AND sa.role = 'SUPER_ADMIN'
    )
  );

-- Prevent role changes except by super admin or auth admin
CREATE POLICY "Role changes require super admin" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles sa
      WHERE sa.id = auth.uid() AND sa.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    -- Allow if updating own role and not changing it
    (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid())) OR
    -- Allow if super admin
    EXISTS (
      SELECT 1 FROM profiles sa
      WHERE sa.id = auth.uid() AND sa.role = 'SUPER_ADMIN'
    )
  );

-- Create user_role_audit table to track role changes
CREATE TABLE IF NOT EXISTS user_role_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  changed_by_id UUID,
  old_role VARCHAR(50),
  new_role VARCHAR(50) NOT NULL,
  reason TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_role_audit_user_id ON user_role_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_audit_changed_by ON user_role_audit(changed_by_id);
CREATE INDEX IF NOT EXISTS idx_user_role_audit_organization_id ON user_role_audit(organization_id);

COMMENT ON TABLE user_role_audit IS 'Append-only audit trail of all user role changes with actor and reason';

-- Add columns to audit_logs for better super admin tracking
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_status_before VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_status_after VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_role ON audit_logs(user_role) WHERE user_role = 'SUPER_ADMIN';

COMMENT ON COLUMN audit_logs.user_role IS 'Role of the actor at the time of the action';
