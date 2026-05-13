-- Add broad reader-facing metadata for the blog index.
-- Topics are intentionally representative buckets, not fine-grained tags.
alter table public.posts
  add column if not exists summary text not null default ''
    check (char_length(summary) <= 240),
  add column if not exists topic text not null default 'notes'
    check (topic in ('macro', 'markets', 'credit', 'ai', 'korea', 'portfolio', 'notes'));

create index if not exists posts_topic_published_idx
  on public.posts (topic, published_at desc);
