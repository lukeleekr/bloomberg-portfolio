-- Public bucket for inline blog-post images. Idempotent like 0001/0002.
-- Uploads are service-role only (from /api/images); anon has SELECT via
-- the public=true flag. No explicit RLS policy rows needed — service-role
-- bypasses RLS by design, matching the comments/posts pattern.
insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;
