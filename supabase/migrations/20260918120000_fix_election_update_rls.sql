-- VoteHub election UPDATE RLS role and organization alignment
-- The application uses ORGANIZATION_ADMIN for organization administrators.
-- The previous UPDATE policy incorrectly checked only for ORG_ADMIN
-- and required created_by = auth.uid().

DROP POLICY IF EXISTS "Org admins can update elections"
ON public.elections;

CREATE POLICY "Org admins can update elections"
ON public.elections
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
