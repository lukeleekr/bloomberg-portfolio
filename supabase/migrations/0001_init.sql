-- Guestbook comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now(),
  client_id text
);

create index if not exists comments_created_at_idx
  on public.comments (created_at desc);

-- Visit counter: rolling daily counts (one row per UTC day)
create table if not exists public.visits_daily (
  day date primary key,
  count bigint not null default 0
);

-- Visit counter: lifetime total (single row, id = 1)
create table if not exists public.visits_total (
  id int primary key default 1,
  count bigint not null default 0,
  constraint visits_total_singleton check (id = 1)
);

insert into public.visits_total (id, count)
values (1, 0)
on conflict (id) do nothing;

-- Atomic increment helper for visits (avoids read-modify-write races).
--
-- SECURITY DEFINER hardening:
--   1. set search_path = '' to avoid caller-controlled schema resolution
--   2. fully qualify every relation with its schema
create or replace function public.increment_visit()
returns table(today bigint, total bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today bigint;
  v_total bigint;
  v_day date := (now() at time zone 'utc')::date;
begin
  insert into public.visits_daily (day, count)
    values (v_day, 1)
    on conflict (day) do update
      set count = public.visits_daily.count + 1
    returning count into v_today;

  update public.visits_total
    set count = public.visits_total.count + 1
    where id = 1
    returning count into v_total;

  return query
  select v_today, v_total;
end;
$$;

-- Lock down execute privileges so only the service role can call this.
revoke execute on function public.increment_visit() from public;
revoke execute on function public.increment_visit() from anon;
revoke execute on function public.increment_visit() from authenticated;

alter table public.comments enable row level security;
alter table public.visits_daily enable row level security;
alter table public.visits_total enable row level security;

drop policy if exists "comments_public_read" on public.comments;

create policy "comments_public_read"
  on public.comments
  for select
  using (true);

-- No anon insert/update/delete policies by design. Route handlers use the
-- service role for writes, and future browser access stays denied by default.
