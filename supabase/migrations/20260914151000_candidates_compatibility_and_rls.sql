ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS position_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS biography TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.candidates AS candidates
SET organization_id = elections.organization_id
FROM public.elections AS elections
WHERE candidates.election_id = elections.id
  AND candidates.organization_id IS NULL;

UPDATE public.candidates
SET
  display_name = name,
  first_name = CASE
    WHEN position(' ' IN trim(name)) > 0
      THEN split_part(trim(name), ' ', 1)
    ELSE trim(name)
  END,
  last_name = CASE
    WHEN position(' ' IN trim(name)) > 0
      THEN substring(trim(name) FROM position(' ' IN trim(name)) + 1)
    ELSE ''
  END,
  updated_at = NOW()
WHERE display_name IS NULL;

UPDATE public.candidates
SET status = 'PENDING'
WHERE status IS NULL;

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_position_id_fkey;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_position_id_fkey
  FOREIGN KEY (position_id)
  REFERENCES public.positions(id)
  ON DELETE CASCADE;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Election managers can update candidates"
ON public.candidates;

CREATE POLICY "Election managers can update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (
  organization_id = (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
  AND (
    SELECT profiles.role
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  ) IN (
    'ORGANIZATION_ADMIN',
    'ORG_ADMIN',
    'ELECTION_OFFICER'
  )
)
WITH CHECK (
  organization_id = (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
  AND (
    SELECT profiles.role
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  ) IN (
    'ORGANIZATION_ADMIN',
    'ORG_ADMIN',
    'ELECTION_OFFICER'
  )
);

DROP POLICY IF EXISTS "Election managers can delete candidates"
ON public.candidates;

CREATE POLICY "Election managers can delete candidates"
ON public.candidates
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
  AND (
    SELECT profiles.role
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  ) IN (
    'ORGANIZATION_ADMIN',
    'ORG_ADMIN',
    'ELECTION_OFFICER'
  )
);
