-- Trigger: create profile row when a new auth user is created
-- Run this in the Supabase SQL editor or via the Supabase CLI.

-- Function to insert a profile from auth.users metadata
create function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, organization_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name'),
    (new.raw_user_meta_data->>'organization_name'),
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger on auth.users to call the function after insert
create trigger auth_insert_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();
