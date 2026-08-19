-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ballots table
-- Represents a submitted ballot for an election
CREATE TABLE IF NOT EXISTS ballots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL,
  election_voter_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'VERIFIED', 'DISPUTED')),
  ballot_reference VARCHAR(50) NOT NULL UNIQUE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create ballot_selections table
-- Represents individual selections within a ballot
CREATE TABLE IF NOT EXISTS ballot_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  position_id UUID NOT NULL,
  candidate_id UUID,
  abstained BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance and constraints
CREATE INDEX IF NOT EXISTS idx_ballots_election_id ON ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_election_voter_id ON ballots(election_voter_id);
CREATE INDEX IF NOT EXISTS idx_ballots_status ON ballots(status);
CREATE INDEX IF NOT EXISTS idx_ballot_selections_ballot_id ON ballot_selections(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballot_selections_position_id ON ballot_selections(position_id);
CREATE INDEX IF NOT EXISTS idx_ballot_selections_candidate_id ON ballot_selections(candidate_id);

-- Add unique constraint: one ballot per election_voter
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_ballot_per_voter ON ballots(election_voter_id)
WHERE status != 'DISPUTED';

-- Add check constraint: cannot select duplicate candidates in same ballot for same position
-- This is enforced at application level since PostgreSQL doesn't support conditional uniqueness perfectly
-- But we can add a trigger if needed

-- Add comment for privacy
COMMENT ON TABLE ballot_selections IS 'Ballot selections are separated from voter identity. The election_voter_id is stored in ballots table only, not in selections.';
COMMENT ON TABLE ballots IS 'Ballots link to election_voters for participation tracking but selections do not reference voter identity.';

-- Add updated_at trigger for ballots
CREATE OR REPLACE FUNCTION update_ballots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ballots_update_timestamp
BEFORE UPDATE ON ballots
FOR EACH ROW
EXECUTE FUNCTION update_ballots_updated_at();

-- Audit: Log ballot submissions (administrative event, not vote selections)
CREATE TABLE IF NOT EXISTS ballot_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL, -- e.g., 'ballot.submitted', 'ballot.system_enabled'
  election_id UUID NOT NULL,
  details JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ballot_audit_events_election_id ON ballot_audit_events(election_id);
CREATE INDEX IF NOT EXISTS idx_ballot_audit_events_event_type ON ballot_audit_events(event_type);

COMMENT ON TABLE ballot_audit_events IS 'Audit trail for voting system events. Does NOT contain vote selections for privacy.';
