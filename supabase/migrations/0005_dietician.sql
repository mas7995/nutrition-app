-- ─────────────────────────────────────────────────────────────
-- Phase 7: dietician linking, notes, cross-access RLS, realtime
--
-- A client generates a short invite code; a dietician redeems it to create a
-- link. Links are only ever created through the client's code (never auto),
-- and a client can revoke at any time. A linked dietician can read the
-- client's profile / plan / logs and edit the plan + leave notes — enforced
-- by RLS, not the UI.
-- ─────────────────────────────────────────────────────────────

-- ── Tables ───────────────────────────────────────────────────
create table if not exists public.dietician_links (
  id           uuid primary key default gen_random_uuid(),
  dietician_id uuid not null references auth.users (id) on delete cascade,
  client_id    uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  created_at   timestamptz not null default now(),
  unique (dietician_id, client_id)
);
alter table public.dietician_links enable row level security;

create table if not exists public.invite_codes (
  code       text primary key,
  client_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.invite_codes enable row level security;

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users (id) on delete cascade,
  client_id   uuid not null references auth.users (id) on delete cascade,
  food_log_id uuid references public.food_logs (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
alter table public.notes enable row level security;
create index if not exists notes_client_created_idx on public.notes (client_id, created_at desc);

-- ── Helper: is the caller an active dietician for this client? ──
-- SECURITY DEFINER so it can read dietician_links regardless of the caller's
-- own RLS view (and to avoid recursive policy evaluation).
create or replace function public.is_linked_dietician(client uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.dietician_links
    where dietician_id = auth.uid()
      and client_id = client
      and status = 'active'
  );
$$;

-- ── dietician_links RLS ──────────────────────────────────────
drop policy if exists "links_select_involved" on public.dietician_links;
create policy "links_select_involved" on public.dietician_links
  for select using (auth.uid() = dietician_id or auth.uid() = client_id);

-- Either party can update status (client revokes; dietician can unlink).
drop policy if exists "links_update_involved" on public.dietician_links;
create policy "links_update_involved" on public.dietician_links
  for update using (auth.uid() = dietician_id or auth.uid() = client_id)
  with check (auth.uid() = dietician_id or auth.uid() = client_id);

drop policy if exists "links_delete_involved" on public.dietician_links;
create policy "links_delete_involved" on public.dietician_links
  for delete using (auth.uid() = dietician_id or auth.uid() = client_id);
-- No INSERT policy: links are created only via redeem_invite_code (definer).

-- ── invite_codes RLS (client manages own; redeem uses definer) ─
drop policy if exists "codes_select_own" on public.invite_codes;
create policy "codes_select_own" on public.invite_codes
  for select using (auth.uid() = client_id);

drop policy if exists "codes_delete_own" on public.invite_codes;
create policy "codes_delete_own" on public.invite_codes
  for delete using (auth.uid() = client_id);

-- ── notes RLS ────────────────────────────────────────────────
drop policy if exists "notes_select_involved" on public.notes;
create policy "notes_select_involved" on public.notes
  for select using (
    auth.uid() = client_id
    or auth.uid() = author_id
    or public.is_linked_dietician(client_id)
  );

drop policy if exists "notes_insert_authorized" on public.notes;
create policy "notes_insert_authorized" on public.notes
  for insert with check (
    auth.uid() = author_id
    and (auth.uid() = client_id or public.is_linked_dietician(client_id))
  );

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = author_id);

-- ── Cross-access: linked dietician can read/edit client data ──
drop policy if exists "profiles_select_linked" on public.profiles;
create policy "profiles_select_linked" on public.profiles
  for select using (public.is_linked_dietician(id));

drop policy if exists "diet_profiles_select_linked" on public.diet_profiles;
create policy "diet_profiles_select_linked" on public.diet_profiles
  for select using (public.is_linked_dietician(user_id));

drop policy if exists "diet_profiles_update_linked" on public.diet_profiles;
create policy "diet_profiles_update_linked" on public.diet_profiles
  for update using (public.is_linked_dietician(user_id))
  with check (public.is_linked_dietician(user_id));

drop policy if exists "food_logs_select_linked" on public.food_logs;
create policy "food_logs_select_linked" on public.food_logs
  for select using (public.is_linked_dietician(user_id));

-- ── RPCs: generate + redeem invite codes ─────────────────────
create or replace function public.create_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code  text;
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  i       int;
begin
  delete from public.invite_codes where client_id = auth.uid(); -- one at a time
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.invite_codes where code = v_code);
  end loop;
  insert into public.invite_codes (code, client_id, expires_at)
    values (v_code, auth.uid(), now() + interval '14 days');
  return v_code;
end;
$$;

create or replace function public.redeem_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  select client_id into v_client from public.invite_codes
    where code = upper(trim(p_code)) and expires_at > now();
  if v_client is null then
    raise exception 'Invalid or expired code';
  end if;
  if v_client = auth.uid() then
    raise exception 'You cannot link to your own account';
  end if;
  insert into public.dietician_links (dietician_id, client_id, status)
    values (auth.uid(), v_client, 'active')
    on conflict (dietician_id, client_id) do update set status = 'active';
  return v_client;
end;
$$;

grant execute on function public.create_invite_code() to authenticated;
grant execute on function public.redeem_invite_code(text) to authenticated;

-- ── Realtime: broadcast changes for live sync ────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'diet_profiles') then
    alter publication supabase_realtime add table public.diet_profiles;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes') then
    alter publication supabase_realtime add table public.notes;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'food_logs') then
    alter publication supabase_realtime add table public.food_logs;
  end if;
end $$;
