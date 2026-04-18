// Server-only DB access for posts. Imports the service-role client — NEVER
// import this module from a Client Component or from posts-shared.ts.
import { supabaseServer } from './supabase-server'
import type { Post, PostStatus } from './posts-shared'

const COLUMNS =
  'id, slug, title, body_md, status, created_at, updated_at, published_at'

export async function listPostsForAdmin(): Promise<Post[]> {
  // Sort admin list by "most relevant date": published_at when present,
  // else created_at. Supabase JS SDK .order() only takes a column name
  // (can't evaluate coalesce in SQL), so we fetch by created_at desc and
  // re-sort in memory. O(N log N) on <100 rows is free.
  const { data, error } = await supabaseServer
    .from('posts')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as Post[]
  return rows.slice().sort((a, b) => {
    const ta = new Date(a.published_at ?? a.created_at).getTime()
    const tb = new Date(b.published_at ?? b.created_at).getTime()
    return tb - ta
  })
}

export async function listPublicPosts(): Promise<Post[]> {
  const { data, error } = await supabaseServer
    .from('posts')
    .select(COLUMNS)
    .eq('status', 'public')
    .order('published_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as Post[]
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabaseServer
    .from('posts')
    .select(COLUMNS)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as Post | null
}

export type CreatePostInput = {
  slug: string
  title: string
  body_md: string
  status: PostStatus
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const published_at =
    input.status === 'public' ? new Date().toISOString() : null
  const { data, error } = await supabaseServer
    .from('posts')
    .insert({ ...input, published_at })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data as Post
}

export type UpdatePostInput = Partial<
  Pick<Post, 'slug' | 'title' | 'body_md' | 'status'>
>

export async function updatePost(
  currentSlug: string,
  input: UpdatePostInput
): Promise<Post | null> {
  const existing = await getPostBySlug(currentSlug)
  if (!existing) return null

  const next: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  }

  // First-publish-wins: set published_at exactly when a post becomes public
  // for the first time; never overwrite an existing value.
  if (input.status === 'public' && !existing.published_at) {
    next.published_at = new Date().toISOString()
  }

  const { data, error } = await supabaseServer
    .from('posts')
    .update(next)
    .eq('id', existing.id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data as Post
}

export async function deletePost(slug: string): Promise<boolean> {
  const { error, count } = await supabaseServer
    .from('posts')
    .delete({ count: 'exact' })
    .eq('slug', slug)
  if (error) throw error
  return (count ?? 0) > 0
}
