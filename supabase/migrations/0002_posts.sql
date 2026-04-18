-- Blog posts: admin-authored markdown with three-state visibility.
-- Mirrors 0001_init.sql style: idempotent DDL, RLS on, no anon policies.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  title text not null check (char_length(title) between 1 and 120),
  body_md text not null default '',
  status text not null default 'draft'
    check (status in ('draft','public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

alter table public.posts enable row level security;
-- No anon policies by design. All reads/writes go through server-side
-- service-role client, matching the existing comments table pattern.
