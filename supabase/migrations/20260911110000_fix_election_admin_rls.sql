-- VoteHub election RLS role alignment
-- The application uses ORGANIZATION_ADMIN for organization administrators.
-- The previous policy incorrectly checked for ORG_ADMIN.

DROP POLICY IF EXISTS "Org admins can create elections" ON public.elections;

CREATE POLICY "Org admins can create elections"
ON public.elections
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    SELECT profiles.role
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  ) = 'ORGANIZATION_ADMIN'
);
