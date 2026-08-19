-- Add result status and publication metadata for election results
ALTER TABLE IF EXISTS elections
  ADD COLUMN IF NOT EXISTS result_status VARCHAR(30) NOT NULL DEFAULT 'NOT_READY';

ALTER TABLE IF EXISTS elections
  ADD COLUMN IF NOT EXISTS winner_rule VARCHAR(30) NOT NULL DEFAULT 'MOST_VOTES';

ALTER TABLE IF EXISTS elections
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS elections
  DROP CONSTRAINT IF EXISTS elections_result_status_check;

ALTER TABLE IF EXISTS elections
  ADD CONSTRAINT elections_result_status_check
  CHECK (result_status IN ('NOT_READY', 'CALCULATING', 'READY', 'PUBLISHED'));

ALTER TABLE IF EXISTS elections
  DROP CONSTRAINT IF EXISTS elections_winner_rule_check;

ALTER TABLE IF EXISTS elections
  ADD CONSTRAINT elections_winner_rule_check
  CHECK (winner_rule IN ('MOST_VOTES', 'TOP_N'));

-- Snapshot table for published result integrity
CREATE TABLE IF NOT EXISTS election_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL UNIQUE REFERENCES elections(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'READY' CHECK (status IN ('READY', 'PUBLISHED')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_results_election_id ON election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_election_results_status ON election_results(status);
CREATE INDEX IF NOT EXISTS idx_election_results_published_at ON election_results(published_at);

CREATE OR REPLACE FUNCTION update_election_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_election_results_update_timestamp ON election_results;
CREATE TRIGGER trg_election_results_update_timestamp
BEFORE UPDATE ON election_results
FOR EACH ROW
EXECUTE FUNCTION update_election_results_updated_at();

COMMENT ON TABLE election_results IS 'Immutable snapshot of an election result after aggregation. It separates published result state from the live ballot data.';
COMMENT ON COLUMN election_results.summary IS 'Aggregated results by position and candidate for secure reporting without exposing raw ballots.';
