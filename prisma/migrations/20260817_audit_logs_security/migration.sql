CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  actor_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL DEFAULT 'unknown',
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_created_at
ON audit_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
ON audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
ON audit_logs (entity_type);

CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_update_timestamp ON audit_logs;
CREATE TRIGGER trg_audit_logs_update_timestamp
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION update_audit_logs_updated_at();

COMMENT ON TABLE audit_logs IS 'Append-only security and administrative event log. It does not include raw ballot selections or voter secret material.';
COMMENT ON COLUMN audit_logs.metadata IS 'Sanitized event data for operational security and audit review only.';
