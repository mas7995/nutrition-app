-- ─────────────────────────────────────────────────────────────
-- Phase 3: diet_profiles
--
-- One row per client — the "opinion" the alignment engine enforces.
-- Targets and rules are stored as jsonb (shapes live in src/types/diet.ts).
-- RLS: a client reads/writes only their own diet profile. Dietician write
-- access for linked clients is added in Phase 7.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.diet_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  targets    jsonb not null,
  rules      jsonb not null,
  strictness text  not null default 'balanced'
             check (strictness in ('lenient', 'balanced', 'strict')),
  updated_at timestamptz not null default now()
);

alter table public.diet_profiles enable row level security;

drop policy if exists "diet_profiles_select_own" on public.diet_profiles;
create policy "diet_profiles_select_own"
  on public.diet_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "diet_profiles_insert_own" on public.diet_profiles;
create policy "diet_profiles_insert_own"
  on public.diet_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "diet_profiles_update_own" on public.diet_profiles;
create policy "diet_profiles_update_own"
  on public.diet_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh on every write.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diet_profiles_touch on public.diet_profiles;
create trigger diet_profiles_touch
  before update on public.diet_profiles
  for each row execute function public.touch_updated_at();
