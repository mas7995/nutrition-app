-- ─────────────────────────────────────────────────────────────
-- Phase 2: profiles + RLS foundations
--
-- One row per authenticated user. `role` decides which app shell they see.
-- RLS is the REAL access control: a user can read and write ONLY their own
-- profile row. Dietician read-access to linked clients is added in Phase 7
-- (it depends on the dietician_links table, which doesn't exist yet).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('client', 'dietician')),
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- A user can create their own profile (first sign-in, role selection).
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- A user can update their own profile (e.g. switch role, rename).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
