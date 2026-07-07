-- ─────────────────────────────────────────────────────────────
-- Phase 4: foods cache
--
-- Normalized product data keyed by barcode, written ONLY by the lookup-food
-- Edge Function (service role, which bypasses RLS). This is public product
-- data, so any authenticated user may read it — but no client may write it.
-- One barcode should hit an external API at most once, then serve from here.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.foods (
  barcode    text primary key,
  source     text not null check (source in ('nutritionix', 'off')),
  food       jsonb not null,          -- the full NormalizedFood shape
  fetched_at timestamptz not null default now()
);

alter table public.foods enable row level security;

-- Readable by any signed-in user.
drop policy if exists "foods_select_authenticated" on public.foods;
create policy "foods_select_authenticated"
  on public.foods
  for select
  to authenticated
  using (true);

-- No insert/update/delete policies: only the service role (Edge Function),
-- which bypasses RLS, can write. Clients can never fabricate cache entries.
