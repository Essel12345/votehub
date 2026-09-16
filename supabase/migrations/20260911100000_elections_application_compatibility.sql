-- VoteHub election schema compatibility
-- Adds the election fields required by the application service.

ALTER TABLE public.elections
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS eligibility_rules TEXT,
  ADD COLUMN IF NOT EXISTS voting_rules TEXT,
  ADD COLUMN IF NOT EXISTS result_visibility TEXT DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS access_mode TEXT DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS support_email TEXT,
  ADD COLUMN IF NOT EXISTS support_phone TEXT,
  ADD COLUMN IF NOT EXISTS support_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS elections_slug_key
  ON public.elections (slug)
  WHERE slug IS NOT NULL;
