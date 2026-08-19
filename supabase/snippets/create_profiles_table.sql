-- Create the Supabase `profiles` table used by auth callback and profile lookups.
-- Run this SQL in the Supabase SQL editor or via the Supabase CLI.

create table if not exists profiles (
  id uuid primary key,
  email text,
  full_name text,
  organization_name text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
