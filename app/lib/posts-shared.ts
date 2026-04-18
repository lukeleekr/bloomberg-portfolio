// Client-safe helpers for the blog. NEVER import `supabase-server` from here
// or anything that does — this module must be importable from Client
// Components (PostEditor).
import { customAlphabet } from 'nanoid'

export type PostStatus = 'draft' | 'private' | 'public'

export type Post = {
  id: string
  slug: string
  title: string
  body_md: string
  status: PostStatus
  created_at: string
  updated_at: string
  published_at: string | null
}

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const SLUG_MAX_LEN = 60
export const TITLE_MIN_LEN = 1
export const TITLE_MAX_LEN = 120

// Lowercase alphanumeric only. No hyphens in auto-generated slugs — hyphens
// are legal in user-typed slugs but awkward when randomly placed.
export const generateSlug = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  8,
)

export function isValidSlug(slug: string): boolean {
  return slug.length <= SLUG_MAX_LEN && SLUG_REGEX.test(slug)
}

export function isValidTitle(title: string): boolean {
  const len = title.length
  return len >= TITLE_MIN_LEN && len <= TITLE_MAX_LEN
}

export function isValidStatus(s: unknown): s is PostStatus {
  return s === 'draft' || s === 'private' || s === 'public'
}

// Strip common markdown syntax so a post body previews as plain-ish text.
// Lossy for code blocks and tables — acceptable for v1.
export function excerpt(bodyMd: string, maxLen = 200): string {
  const cleaned = bodyMd
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/^#{1,6}\s+/gm, '') // heading hashes
    .replace(/[*_~>|#-]{1,}/g, '') // stray markdown tokens
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen).trimEnd() + '…'
}
