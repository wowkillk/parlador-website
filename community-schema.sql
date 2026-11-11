-- PARLADOR community directory, v1. Run once in Supabase SQL Editor.
-- Only members who explicitly opt in are listed; never expose auth.users or email.
create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  nickname text not null default '' check (char_length(nickname) <= 32),
  bio text not null default '' check (char_length(bio) <= 280),
  is_listed boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.member_profiles enable row level security;
revoke all on public.member_profiles from anon;
grant select, insert, update, delete on public.member_profiles to authenticated;

-- Only listed profiles can be viewed by other members; owners can view their draft.
create policy "Authenticated members read listed profiles or their own"
  on public.member_profiles for select to authenticated
  using (is_listed = true or user_id = (select auth.uid()));
create policy "Members create their own profile"
  on public.member_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Members update their own profile"
  on public.member_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members delete their own profile"
  on public.member_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

-- Make sure this table contains ONLY public-to-members fields. Do not add private columns.
