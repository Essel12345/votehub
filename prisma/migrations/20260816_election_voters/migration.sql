-- Create election_voters table
-- Tracks voter eligibility and participation in elections
CREATE TABLE IF NOT EXISTS election_voters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL,
  voter_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ELIGIBLE' CHECK (status IN ('ELIGIBLE', 'INELIGIBLE', 'ABSTAINED')),
  voted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(election_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_election_voters_election_id ON election_voters(election_id);
CREATE INDEX IF NOT EXISTS idx_election_voters_voter_id ON election_voters(voter_id);
CREATE INDEX IF NOT EXISTS idx_election_voters_organization_id ON election_voters(organization_id);
CREATE INDEX IF NOT EXISTS idx_election_voters_status ON election_voters(status);

-- Extend positions table with voting configuration
-- Add voting_type and max_choices if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='positions' AND column_name='voting_type') THEN
    ALTER TABLE positions ADD COLUMN voting_type VARCHAR(50) NOT NULL DEFAULT 'SINGLE_CHOICE';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='positions' AND column_name='max_choices') THEN
    ALTER TABLE positions ADD COLUMN max_choices INTEGER NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='positions' AND column_name='allow_abstention') THEN
    ALTER TABLE positions ADD COLUMN allow_abstention BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add check constraints for positions voting rules
ALTER TABLE positions DROP CONSTRAINT IF EXISTS chk_voting_type;
ALTER TABLE positions ADD CONSTRAINT chk_voting_type 
  CHECK (voting_type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE'));

ALTER TABLE positions DROP CONSTRAINT IF EXISTS chk_max_choices;
ALTER TABLE positions ADD CONSTRAINT chk_max_choices 
  CHECK (max_choices > 0);

COMMENT ON TABLE election_voters IS 'Tracks which voters are eligible for which elections and their participation status.';
COMMENT ON COLUMN election_voters.status IS 'ELIGIBLE: Can still vote, INELIGIBLE: Cannot vote, ABSTAINED: Voted but did not select any candidates';
