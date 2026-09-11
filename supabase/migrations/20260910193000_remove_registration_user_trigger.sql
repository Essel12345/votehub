-- VoteHub registration architecture
-- The application registration service is the authoritative creator
-- of organizations and profiles.
--
-- The previous auth.users trigger created duplicate organization/profile
-- records when registerOrganization() created an Auth user.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();