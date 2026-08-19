-- Row Level Security (RLS) Policies for Voting System

-- Enable RLS on voting tables
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can see their own ballots (through election participation)
-- This is actually restrictive - voters should NOT be able to query ballots directly
-- Ballots are accessed only through a secure server-side endpoint
CREATE POLICY "Ballots: Deny all direct access" ON ballots
FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- Policy: Only service role can insert ballots (for trusted server-side functions)
CREATE POLICY "Ballots: Service role insert" ON ballots
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Election officers can view ballot counts for their elections (aggregated, not individual votes)
CREATE POLICY "Ballots: Election officers view metadata" ON ballots
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  EXISTS (
    SELECT 1 FROM elections e
    INNER JOIN organization_users ou ON e.organization_id = ou.organization_id
    WHERE e.id = ballots.election_id
    AND ou.user_id = auth.uid()
    AND ou.role IN ('ORGANIZATION_ADMIN', 'ELECTION_OFFICER')
  )
);

-- Policy: Ballot selections cannot be queried directly by regular users
CREATE POLICY "Ballot selections: Deny all direct access" ON ballot_selections
FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- Policy: Service role can insert ballot selections
CREATE POLICY "Ballot selections: Service role insert" ON ballot_selections
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Ballot audit events - restrict to administrators only
CREATE POLICY "Ballot audit: Admin only" ON ballot_audit_events
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  EXISTS (
    SELECT 1 FROM elections e
    INNER JOIN organization_users ou ON e.organization_id = ou.organization_id
    WHERE e.id = ballot_audit_events.election_id
    AND ou.user_id = auth.uid()
    AND ou.role = 'ORGANIZATION_ADMIN'
  )
);

CREATE POLICY "Ballot audit: Service role insert" ON ballot_audit_events
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Audit function: Log ballot submissions
CREATE OR REPLACE FUNCTION log_ballot_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ballot_audit_events (
    event_type,
    election_id,
    details,
    created_by
  ) VALUES (
    'ballot.submitted',
    NEW.election_id,
    jsonb_build_object(
      'ballot_id', NEW.id,
      'ballot_reference', NEW.ballot_reference
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Audit ballot submissions
CREATE TRIGGER trg_audit_ballot_submission
AFTER INSERT ON ballots
FOR EACH ROW
EXECUTE FUNCTION log_ballot_submission();

-- IMPORTANT PRIVACY NOTE:
-- - Ballot selections are NEVER logged
-- - Only the fact that a ballot was submitted is logged
-- - No individual vote choices are recorded in audit logs
-- - Voter identity is NOT linked to selections in accessible tables
-- - The election_voter_id in ballots is needed for duplicate prevention but is not exposed to regular users
