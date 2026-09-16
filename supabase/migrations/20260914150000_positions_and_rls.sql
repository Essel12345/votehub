CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS positions_election_id_idx
  ON public.positions (election_id);

CREATE INDEX IF NOT EXISTS positions_organization_id_idx
  ON public.positions (organization_id);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins can create positions"
ON public.positions;

CREATE POLICY "Org admins can create positions"
ON public.positions
FOR INSERT
TO authenticated
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
  ) IN ('ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ELECTION_OFFICER')
);

DROP POLICY IF EXISTS "Organization members can view positions"
ON public.positions;

CREATE POLICY "Organization members can view positions"
ON public.positions
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Election managers can update positions"
ON public.positions;

CREATE POLICY "Election managers can update positions"
ON public.positions
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
  ) IN ('ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ELECTION_OFFICER')
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
  ) IN ('ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ELECTION_OFFICER')
);

DROP POLICY IF EXISTS "Election managers can delete positions"
ON public.positions;

CREATE POLICY "Election managers can delete positions"
ON public.positions
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
  ) IN ('ORGANIZATION_ADMIN', 'ORG_ADMIN', 'ELECTION_OFFICER')
);
