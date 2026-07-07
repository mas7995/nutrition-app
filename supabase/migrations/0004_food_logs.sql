-- ─────────────────────────────────────────────────────────────
-- Phase 5: food_logs
--
-- Each logged item snapshots the nutrients, servings, and the verdict +
-- reasons computed at log time — so history stays truthful even if the
-- product data or the user's goals change later.
-- RLS: a client reads/writes only their own logs. Dietician read access for
-- linked clients is added in Phase 7.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.food_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  barcode    text,
  name       text not null,
  meal       text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  nutrients  jsonb not null,          -- NutrientsPerServing snapshot
  servings   numeric not null default 1 check (servings > 0),
  verdict    text not null check (verdict in ('green', 'amber', 'red')),
  reasons    jsonb not null default '[]'::jsonb,
  logged_at  timestamptz not null default now()
);

create index if not exists food_logs_user_logged_at_idx
  on public.food_logs (user_id, logged_at desc);

alter table public.food_logs enable row level security;

drop policy if exists "food_logs_select_own" on public.food_logs;
create policy "food_logs_select_own"
  on public.food_logs for select using (auth.uid() = user_id);

drop policy if exists "food_logs_insert_own" on public.food_logs;
create policy "food_logs_insert_own"
  on public.food_logs for insert with check (auth.uid() = user_id);

drop policy if exists "food_logs_update_own" on public.food_logs;
create policy "food_logs_update_own"
  on public.food_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "food_logs_delete_own" on public.food_logs;
create policy "food_logs_delete_own"
  on public.food_logs for delete using (auth.uid() = user_id);
